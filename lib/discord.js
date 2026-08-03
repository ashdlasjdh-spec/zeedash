// Discord OAuth (identify) + role lookup via a bot token in your guild.
const API = "https://discord.com/api";

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
