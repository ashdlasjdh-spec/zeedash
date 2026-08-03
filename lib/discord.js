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
    scope: "identify",
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

// Read the member's roles in your guild (optional — used to auto-map roles if you want).
export async function getGuildMember(userId) {
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) return null;
  const res = await fetch(`${API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json(); // { roles: [...], nick, user }
}

// Map a member's Discord roles to a dashboard role using DISCORD_ROLE_MAP.
// DISCORD_ROLE_MAP is JSON: { "<discordRoleId>": "owner|cofounder|admin|staff", ... }
// Set these to the SAME roles your bot uses for perms, so there's one source of truth.
import { rank } from "./permissions";
export async function roleFromDiscord(userId) {
  const member = await getGuildMember(userId);
  if (!member || !Array.isArray(member.roles)) return null;
  let map = {};
  try { map = JSON.parse(process.env.DISCORD_ROLE_MAP || "{}"); } catch {}
  let best = null;
  for (const roleId of member.roles) {
    const dash = map[roleId];
    if (dash && (best === null || rank(dash) > rank(best))) best = dash;
  }
  return best;
}
