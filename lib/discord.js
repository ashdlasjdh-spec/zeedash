// Discord OAuth (identify) + role lookup via a bot token in your guild.
import { kvGetJSON, kvSetJSON } from "./kv";
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

// Get-or-create a bot-owned webhook (named "zhd-webhook") in a channel, returning { id, token }, so we
// can post a message under a CUSTOM name + avatar (the only way a shared bot can appear different per
// server on its posts). Reused, not recreated. Needs Manage Webhooks. Returns null on failure.
const WEBHOOK_NAME = "zhd-webhook";
async function getWebhook(channelId) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !channelId) return null;
  try {
    const r = await fetch(`${API}/channels/${channelId}/webhooks`, { headers: { Authorization: `Bot ${token}` } });
    if (r.ok) {
      const list = await r.json().catch(() => []);
      const mine = Array.isArray(list) ? list.find((w) => w && w.name === WEBHOOK_NAME && w.token) : null;
      if (mine) return { id: mine.id, token: mine.token };
    }
    const c = await fetch(`${API}/channels/${channelId}/webhooks`, {
      method: "POST", headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: WEBHOOK_NAME }),
    });
    if (!c.ok) return null;
    const w = await c.json().catch(() => null);
    return w && w.id && w.token ? { id: w.id, token: w.token } : null;
  } catch { return null; }
}

// Post a message DIRECTLY to a channel via the bot token — used by the dashboard "Publish" so a plain
// message/embed sends INSTANTLY, with no queue and no dependency on the bot process running/polling.
// If `profile` ({ name, avatarUrl }) is given, the message is sent through a webhook so it shows that
// custom name/avatar (per-guild posting identity). Returns { ok } or { ok:false, error }.
export async function postChannelMessage(channelId, { content, embed, profile } = {}) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { ok: false, error: "The dashboard has no bot token configured (DISCORD_BOT_TOKEN)." };
  if (!channelId) return { ok: false, error: "No channel selected." };
  const body = {};
  const c = content ? String(content).slice(0, 2000) : "";
  if (c) body.content = c;
  if (embed) body.embeds = [embed];
  if (!body.content && !body.embeds) return { ok: false, error: "Nothing to send — add text or an embed." };

  // Custom per-guild posting identity → send via a webhook with a name/avatar override.
  if (profile && (profile.name || profile.avatarUrl)) {
    const wh = await getWebhook(channelId);
    if (!wh) return { ok: false, error: "Couldn't set up the custom-profile webhook — the bot needs Manage Webhooks in that channel." };
    if (profile.name) body.username = String(profile.name).slice(0, 80);
    if (/^https?:\/\//.test(profile.avatarUrl || "")) body.avatar_url = String(profile.avatarUrl);
    try {
      const res = await fetch(`${API}/webhooks/${wh.id}/${wh.token}?wait=true`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) return { ok: true };
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j?.message || `Webhook post failed (Discord ${res.status}).` };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const j = await res.json().catch(() => ({}));
    if (res.status === 403) return { ok: false, error: "The bot can't post there — it needs View Channel, Send Messages and Embed Links in that channel." };
    if (res.status === 404) return { ok: false, error: "Channel not found — the bot isn't in that server, or the channel was deleted." };
    if (res.status === 429) return { ok: false, error: "Rate limited by Discord — try again in a moment." };
    return { ok: false, error: j?.message || `Discord returned ${res.status}.` };
  } catch (e) {
    return { ok: false, error: e.message };
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

// The guilds the signed-in user is a member of, WITH their permissions in each (needs the `guilds`
// OAuth scope). Returns [{ id, name, admin, owner }] — admin = holds the Administrator permission
// (or owns the guild). Drives the Server Management section's per-server access. Best-effort → [].
const ADMINISTRATOR = 0x8n;
export async function getUserGuilds(accessToken) {
  try {
    const res = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return [];
    const list = await res.json().catch(() => []);
    if (!Array.isArray(list)) return [];
    return list.slice(0, 200).map((g) => {
      let admin = false;
      try { admin = (BigInt(g.permissions || 0) & ADMINISTRATOR) === ADMINISTRATOR; } catch { /* bad bitfield */ }
      const owner = !!g.owner;
      return { id: String(g.id), name: g.name || null, admin: admin || owner, owner };
    });
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
  // Cross-instance cache so the many dropdown loads across serverless instances don't each hit Discord
  // (which rate-limits shared IPs). fresh=1 (e.g. right after making a channel) bypasses it. Fail-open.
  if (!fresh) {
    const shared = await kvGetJSON(`meta:${guildId}`);
    if (shared && shared.data && Number.isFinite(shared.at) && Date.now() - shared.at < 10000) {
      _metaCache.set(guildId, { at: shared.at, data: shared.data });
      return shared.data;
    }
  }
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
  const at = Date.now();
  _metaCache.set(guildId, { at, data });
  kvSetJSON(`meta:${guildId}`, { at, data }, 15); // shared ~15s; read-fresh window is 10s
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

// Resolve Discord avatar CDN URLs for a batch of user ids, using a per-process +
// cross-instance (Redis, ~6h) cache so the rate-limited users API is hit at most once
// per user per window. Returns { id: url } ("" when unresolved). Public-safe (no session).
const _avatarCache = new Map(); // id -> { url, at }
const AV_TTL = 6 * 3600 * 1000;
export async function resolveAvatars(ids) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clean = [...new Set((ids || []).map(String).filter((s) => /^\d{5,}$/.test(s)))].slice(0, 50);
  const out = {};
  for (const id of clean) {
    const c = _avatarCache.get(id);
    if (c && Date.now() - c.at < AV_TTL) { out[id] = c.url; continue; }
    let hit = null;
    try { hit = await kvGetJSON(`davatar:${id}`); } catch {}
    if (hit && typeof hit.url === "string" && Number.isFinite(hit.at) && Date.now() - hit.at < AV_TTL) {
      _avatarCache.set(id, hit); out[id] = hit.url; continue;
    }
    let url = "";
    if (token) {
      try {
        const r = await fetch(`${API}/users/${id}`, { headers: { Authorization: `Bot ${token}` } });
        if (r.ok) {
          const d = await r.json();
          url = d.avatar
            ? `https://cdn.discordapp.com/avatars/${id}/${d.avatar}.png?size=64`
            : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`;
        }
      } catch {}
    }
    const at = Date.now(); _avatarCache.set(id, { url, at });
    if (url) { try { kvSetJSON(`davatar:${id}`, { url, at }, 6 * 3600); } catch {} }
    out[id] = url;
  }
  return out;
}

// Resolve CURRENT guild name + icon straight from Discord (bot token), so the public pages show the
// live server avatar rather than the last hash the bot happened to report into server_stats. Cached
// per-process + Redis (~1h). Returns { id: { name, icon } } where icon is a ready CDN URL or null.
const _guildInfoCache = new Map(); // id -> { v: { name, icon }, at }
const GI_TTL = 60 * 60 * 1000;
export async function resolveGuildInfo(ids) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clean = [...new Set((ids || []).map(String).filter((s) => /^\d{5,}$/.test(s)))].slice(0, 25);
  const out = {};
  for (const id of clean) {
    const c = _guildInfoCache.get(id);
    if (c && Date.now() - c.at < GI_TTL) { out[id] = c.v; continue; }
    let hit = null;
    try { hit = await kvGetJSON(`ginfo:${id}`); } catch {}
    if (hit && hit.v && Number.isFinite(hit.at) && Date.now() - hit.at < GI_TTL) { _guildInfoCache.set(id, hit); out[id] = hit.v; continue; }
    let v = null;
    if (token) {
      try {
        const r = await fetch(`${API}/guilds/${id}`, { headers: { Authorization: `Bot ${token}` } });
        if (r.ok) {
          const d = await r.json();
          const ext = d.icon && String(d.icon).startsWith("a_") ? "gif" : "png";
          v = { name: d.name || null, icon: d.icon ? `https://cdn.discordapp.com/icons/${id}/${d.icon}.${ext}?size=96` : null };
        }
      } catch {}
    }
    const at = Date.now();
    if (v) { _guildInfoCache.set(id, { v, at }); try { kvSetJSON(`ginfo:${id}`, { v, at }, 3600); } catch {} out[id] = v; }
    else out[id] = null;
  }
  return out;
}
