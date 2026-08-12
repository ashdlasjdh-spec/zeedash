// Discord OAuth (identify) + role lookup via a bot token in your guild.
const API = "https://discord.com/api";

// Post a dashboard action to the bot-log channel using the same bot token that reads
// roles. Best-effort: never throws, so a Discord hiccup can't fail the underlying
// action. Channel is overridable via DISCORD_LOG_CHANNEL_ID.
export async function postLog({ actorName, action, category, target, detail }) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const channel = process.env.DISCORD_LOG_CHANNEL_ID || "1533027437145882684";
    if (!token || !channel) return;
    const colors = { grant: 0x22c55e, revoke: 0xef4444, kick: 0xef4444, decline: 0xef4444, declineAll: 0xef4444, promote: 0x22c55e, accept: 0x22c55e, acceptAll: 0x22c55e, demote: 0xf59e0b, shout: 0x8b5cf6 };
    const nice = String(action || "action").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    const fields = [];
    if (target) fields.push({ name: "Target", value: String(target).slice(0, 256), inline: true });
    if (detail) fields.push({ name: "Detail", value: String(detail).slice(0, 256), inline: true });
    const embed = {
      title: `zhd.lol · ${nice}${category ? ` — ${category}` : ""}`,
      color: colors[action] ?? 0x8b5cf6,
      fields,
      footer: { text: `by ${actorName || "unknown"}` },
      timestamp: new Date().toISOString(),
    };
    await fetch(`${API}/channels/${channel}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (e) {
    console.error("[discord-log] post failed (non-fatal):", e.message);
  }
}

export function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds", // guilds → so we can show only servers the user AND bot share
    state,
  });
  return `${API}/oauth2/authorize?${params}`;
}

export async function exchangeCode(code) {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error("Discord token exchange failed");
  return res.json();
}

export async function getUser(accessToken) {
  const res = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error("Could not fetch Discord user");
  return res.json(); // { id, username, global_name, avatar }
}

// The guild IDs the signed-in user is a member of (needs the `guilds` OAuth scope). Used to show
// only servers the user AND the bot share. Best-effort — returns [] on failure.
export async function getUserGuilds(accessToken) {
  try {
    const res = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return [];
    const list = await res.json().catch(() => []);
    return Array.isArray(list) ? list.map((g) => String(g.id)).slice(0, 200) : [];
  } catch {
    return [];
  }
}

// Discord native AutoMod rules for a guild (needs the bot to have Manage Server there).
export async function getAutomodRules(guildId) {
  if (!process.env.DISCORD_BOT_TOKEN || !guildId) return { error: "not_configured", status: 500 };
  const res = await fetch(`${API}/guilds/${guildId}/auto-moderation/rules`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });
  if (res.status === 403) return { error: "The bot needs the Manage Server permission in this server to read AutoMod rules.", status: 403 };
  if (!res.ok) return { error: `Discord returned ${res.status}`, status: res.status };
  const rules = await res.json().catch(() => []);
  return { rules: Array.isArray(rules) ? rules : [] };
}

// Patch one AutoMod rule with an arbitrary (already-merged) body. Caller preserves untouched fields.
export async function updateAutomodRule(guildId, ruleId, body) {
  if (!process.env.DISCORD_BOT_TOKEN) return { error: "not_configured", status: 500 };
  const res = await fetch(`${API}/guilds/${guildId}/auto-moderation/rules/${ruleId}`, {
    method: "PATCH",
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 403) return { error: "The bot needs Manage Server to edit AutoMod rules.", status: 403 };
  if (!res.ok) { const t = await res.text().catch(() => ""); return { error: `Discord returned ${res.status}${t ? `: ${t.slice(0, 120)}` : ""}`, status: res.status }; }
  return { ok: true };
}

// A guild's channels + roles (for dashboard pickers). Needs only the bot to be in the guild.
// Cached ~10s per guild — long enough to smooth rapid navigation, short enough that a newly-made
// channel/role shows up quickly.
const _metaCache = new Map();
export async function getGuildMeta(guildId, fresh = false) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !guildId) return { error: "not_configured", status: 500 };
  const cached = _metaCache.get(guildId);
  if (!fresh && cached && Date.now() - cached.at < 10000) return cached.data; // fresh=true bypasses cache
  const [chRes, roleRes] = await Promise.all([
    fetch(`${API}/guilds/${guildId}/channels`, { headers: { Authorization: `Bot ${token}` } }),
    fetch(`${API}/guilds/${guildId}/roles`, { headers: { Authorization: `Bot ${token}` } }),
  ]);
  if (!chRes.ok || !roleRes.ok) return { error: `Discord returned ${chRes.status}/${roleRes.status}`, status: chRes.status === 403 || roleRes.status === 403 ? 403 : 500 };
  const chans = (await chRes.json().catch(() => [])) || [];
  const roles = (await roleRes.json().catch(() => [])) || [];
  // Sort like Discord shows them: by the parent category's position, then the channel's own
  // position within it (uncategorised channels first). A raw position sort put new channels last.
  const catPos = new Map();
  for (const c of chans) if (c.type === 4) catPos.set(c.id, c.position ?? 0);
  const order = (c) => [c.parent_id != null ? (catPos.get(c.parent_id) ?? 99999) : -1, c.position ?? 0];
  const pick = (types) => chans
    .filter((c) => types.includes(c.type))
    .sort((a, b) => { const [ap, aq] = order(a); const [bp, bq] = order(b); return ap - bp || aq - bq; })
    .map((c) => ({ id: c.id, name: c.name }));
  const data = {
    text: pick([0, 5, 15]),       // text / announcement / forum
    voice: pick([2, 13]),          // voice / stage
    categories: pick([4]),
    roles: roles.filter((r) => r.id !== guildId && !r.managed).sort((a, b) => (b.position || 0) - (a.position || 0)).map((r) => ({ id: r.id, name: r.name })),
  };
  _metaCache.set(guildId, { at: Date.now(), data });
  return data;
}

// Read the member's roles in a SPECIFIC guild.
export async function getGuildMemberIn(guildId, userId) {
  if (!process.env.DISCORD_BOT_TOKEN || !guildId) return null;
  const res = await fetch(`${API}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json(); // { roles: [...], nick, user }
}

// Read the member's roles in your main guild (DISCORD_GUILD_ID).
export async function getGuildMember(userId) {
  return getGuildMemberIn(process.env.DISCORD_GUILD_ID, userId);
}

// Map a member's Discord roles to a numeric permission LEVEL using DISCORD_ROLE_MAP.
// DISCORD_ROLE_MAP is JSON: { "<discordRoleId>": <level 0-255>, ... } — the SAME
// levels the bot uses, so there's one source of truth. Highest level wins. Returns
// 0 when the member has no mapped role.
import { levelFromRoles } from "./permissions";
// A member's level = the HIGHEST mapped level across the permission guilds — the main server
// (DISCORD_GUILD_ID) AND the staff server (DISCORD_FALLBACK_GUILD_ID, default the staff/training
// guild). So a staff role in EITHER server grants dashboard access, matching the bot. Roles are
// matched by ID via DISCORD_ROLE_MAP, so only mapped roles ever count.
export async function levelFromDiscord(userId) {
  const guildIds = [...new Set([
    process.env.DISCORD_GUILD_ID,
    process.env.DISCORD_FALLBACK_GUILD_ID || "1531917648588312677",
  ].filter(Boolean))];
  let level = 0;
  for (const gid of guildIds) {
    const member = await getGuildMemberIn(gid, userId);
    if (member && Array.isArray(member.roles)) level = Math.max(level, levelFromRoles(member.roles));
  }
  return level;
}
