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
