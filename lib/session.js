import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "./db";
import { levelFromDiscord, getGuildMember, getGuildMemberIn } from "./discord";
import { labelForLevel, canGroupScoped } from "./permissions";

// Discord role IDs (or, via GROUP_SCOPED_LEVELS, levels) that get the FULL scoped group access
// (rank/kick the Crew Leader, Leaderboard Staff & Star ranks). e.g. the "Leaderboard HR" role.
const SCOPED_ROLE_IDS = (process.env.GROUP_SCOPED_ROLE_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
// Role IDs that get a NARROWER scope than "all" — matched to the bot's COMMAND_ROLE_IDS so the
// website and bot grant the same thing. Star Overseer → stars only; Crew Manager → crew leaders only.
const SCOPE_BY_ROLE_ID = {
  "1490148155533164655": "star", // star overseer
  "1484886155248930950": "crew", // crew manager
};
// Scoped roles that live in a SPECIFIC guild (not DISCORD_GUILD_ID). { guildId, roleId, scope }.
// e.g. a "Leaderboard HR" role in the staff server → kick crew leaders + leaderboard staff.
const CROSS_GUILD_SCOPES = [
  { guildId: "1531917648588312677", roleId: "1534335581428125806", scope: "lbhr" },
];

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return new TextEncoder().encode(s);
  // In production, refuse the dev fallback: a missing/weak SESSION_SECRET makes
  // sessions forgeable (anyone could mint an admin cookie). Fail loud instead.
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is unset or too short (need 16+ chars). Refusing to run with an insecure session secret.");
  }
  return new TextEncoder().encode("dev-insecure-secret-change-me");
};
const COOKIE = "zhd_session";

export async function createSession(user) {
  const token = await new SignJWT({ id: user.id, name: user.name, level: user.level, role: user.role, avatar: user.avatar })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  cookies().set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export function clearSession() { cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 }); }

// The login token only proves WHO you are. Your permission LEVEL is resolved LIVE (from your Discord
// roles + DB whitelist) so a rank change takes effect without signing out. A per-process cache keeps
// us from calling Discord on every navigation — the TTL is how stale a rank can be, and we serve the
// cached value INSTANTLY while refreshing in the background so page loads never wait on Discord.
const LEVEL_TTL_MS = 90000;      // hard limit before a page load must wait for a fresh resolve
const LEVEL_SOFT_MS = 20000;     // after this, refresh in the background but serve the cached value now
const levelCache = new Map();    // discordId -> { level, at }
const levelInflight = new Map();
async function liveLevel(discordId, fallback) {
  const c = levelCache.get(discordId);
  const age = c ? Date.now() - c.at : Infinity;
  if (c && age < LEVEL_TTL_MS) {
    // Kick off a background refresh once past the soft window, but don't block this request on it.
    if (age >= LEVEL_SOFT_MS && !levelInflight.has(discordId)) {
      const p = resolveLevel(discordId).then((lvl) => { levelCache.set(discordId, { level: lvl, at: Date.now() }); }).catch(() => {}).finally(() => levelInflight.delete(discordId));
      levelInflight.set(discordId, p);
    }
    return c.level;
  }
  try {
    const level = await resolveLevel(discordId);
    levelCache.set(discordId, { level, at: Date.now() });
    return level;
  } catch {
    // Discord/DB hiccup — don't lock anyone out; reuse the last known / token level.
    return c ? c.level : (Number(fallback) || 0);
  }
}

// Resolve the member's scoped-group access as a set of scope KEYS ("all" | "star" | "crew").
// Empty = no scoped access. Cached like the level. A user with several scoped roles gets the union.
const scopeCache = new Map(); // discordId -> { v: string[], at }
async function liveScope(discordId, level) {
  const out = new Set();
  if (canGroupScoped(level)) out.add("all"); // level-based opt-in (GROUP_SCOPED_LEVELS) still works
  const c = scopeCache.get(discordId);
  let roleScopes = c ? c.v : [];
  if (!c || Date.now() - c.at >= LEVEL_TTL_MS) {
    try {
      const m = await getGuildMember(discordId);
      const roles = Array.isArray(m?.roles) ? m.roles.map(String) : [];
      const found = new Set();
      if (roles.some((r) => SCOPED_ROLE_IDS.includes(r))) found.add("all");
      for (const r of roles) { const k = SCOPE_BY_ROLE_ID[r]; if (k) found.add(k); }
      // Roles that live in a different guild (e.g. the staff-server Leaderboard HR role).
      for (const { guildId, roleId, scope } of CROSS_GUILD_SCOPES) {
        try {
          const gm = await getGuildMemberIn(guildId, discordId);
          if (Array.isArray(gm?.roles) && gm.roles.map(String).includes(roleId)) found.add(scope);
        } catch { /* ignore one guild's failure */ }
      }
      roleScopes = [...found];
      scopeCache.set(discordId, { v: roleScopes, at: Date.now() });
    } catch { /* keep last known */ }
  }
  for (const k of roleScopes) out.add(k);
  return [...out];
}

// Per-guild Discord permissions (from user_guilds.guild_perms, written at login). Cached like the
// level. Shape: { "<guildId>": { a: adminBool, o: ownerBool } }. Drives the Server section only.
const serverPermCache = new Map(); // id -> { v, at }
async function liveServerPerms(discordId) {
  const c = serverPermCache.get(discordId);
  if (c && Date.now() - c.at < LEVEL_TTL_MS) return c.v;
  let v = c ? c.v : {};
  try {
    const rows = await query("select guild_perms from user_guilds where discord_id=$1", [discordId]);
    const gp = rows[0]?.guild_perms;
    v = gp && typeof gp === "object" ? gp : {};
    serverPermCache.set(discordId, { v, at: Date.now() });
  } catch { /* keep last known */ }
  return v;
}

// Blacklist check — cached like the level so it's one DB hit per 15s per user. A blacklisted
// Discord id is denied the whole site.
const blCache = new Map(); // id -> { v, at }
async function liveBlacklisted(discordId) {
  const c = blCache.get(discordId);
  if (c && Date.now() - c.at < LEVEL_TTL_MS) return c.v;
  let v = c ? c.v : false;
  try { const r = await query("select 1 from blacklist where discord_id=$1", [discordId]); v = r.length > 0; blCache.set(discordId, { v, at: Date.now() }); }
  catch { /* table may not exist yet — fail open so nobody is wrongly locked out */ }
  return v;
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value; if (!token) return null;
  let payload;
  try { ({ payload } = await jwtVerify(token, secret())); } catch { return null; }
  if (await liveBlacklisted(payload.id)) return null; // blocked from the dashboard
  const level = await liveLevel(payload.id, payload.level);
  const scope = await liveScope(payload.id, level); // string[] of scope keys
  const scopedGroup = scope.length > 0;
  const serverPerms = await liveServerPerms(payload.id); // { guildId: {a,o} } — Server section access
  const serverGuildIds = Object.keys(serverPerms).filter((g) => serverPerms[g]?.a || serverPerms[g]?.o);
  const gameAccess = level > 0 || scopedGroup; // Roblox staff ladder → the Game/whitelist section
  if (!gameAccess && serverGuildIds.length === 0) return null; // no access at all -> signed out
  // Server-only users keep level 0 so NO Game capability unlocks; scoped-only users get base 1.
  const eff = level > 0 ? level : (scopedGroup ? 1 : 0);
  return { ...payload, level: eff, role: labelForLevel(eff), scopedGroup, scope, serverPerms, serverGuildIds, gameAccess };
}

// Resolve a member's numeric permission LEVEL. Priority: the higher of their real
// Discord level and any DB whitelist override (which can promote). BOOTSTRAP_OWNER_IDS
// are a break-glass fallback (top level) so you can still get in before any role is
// mapped. Returns 0 when the member has no access at all.
export async function resolveLevel(discordId) {
  let dbLevel = 0;
  try { const rows = await query("select role from whitelist where discord_id=$1", [discordId]); dbLevel = Number(rows[0]?.role) || 0; } catch {}

  let discordLevel = 0;
  try { discordLevel = await levelFromDiscord(discordId); } catch {}

  let level = Math.max(dbLevel, discordLevel);
  if (level > 0) return level;

  const owners = (process.env.BOOTSTRAP_OWNER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return owners.includes(discordId) ? 255 : 0;
}
export { labelForLevel };
