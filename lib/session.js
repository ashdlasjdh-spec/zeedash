import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "./db";
import { levelFromDiscord, getGuildMember } from "./discord";
import { labelForLevel, canGroupScoped } from "./permissions";

// Discord role IDs (or, via GROUP_SCOPED_LEVELS, levels) that get LIMITED group access
// (rank/kick only the Crew Leader & Leaderboard Staff ranks). e.g. the "Leaderboard HR" role.
const SCOPED_ROLE_IDS = (process.env.GROUP_SCOPED_ROLE_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);

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

// The login token only proves WHO you are. Your permission LEVEL is resolved LIVE on
// every request (from your Discord roles + DB whitelist) so a rank change takes effect
// on your next page load / action — no sign-out needed. A short per-process cache keeps
// us from calling Discord on literally every request; TTL is how stale a rank can be.
const LEVEL_TTL_MS = 15000;
const levelCache = new Map(); // discordId -> { level, at }
async function liveLevel(discordId, fallback) {
  const c = levelCache.get(discordId);
  if (c && Date.now() - c.at < LEVEL_TTL_MS) return c.level;
  try {
    const level = await resolveLevel(discordId);
    levelCache.set(discordId, { level, at: Date.now() });
    return level;
  } catch {
    // Discord/DB hiccup — don't lock anyone out; reuse the last known / token level.
    return c ? c.level : (Number(fallback) || 0);
  }
}

// Resolve whether the member has a scoped-group role (or a scoped level). Cached like the level.
const scopedCache = new Map(); // discordId -> { v, at }
async function liveScoped(discordId, level) {
  if (canGroupScoped(level)) return true; // level-based opt-in (GROUP_SCOPED_LEVELS) still works
  if (!SCOPED_ROLE_IDS.length) return false;
  const c = scopedCache.get(discordId);
  if (c && Date.now() - c.at < LEVEL_TTL_MS) return c.v;
  let v = c ? c.v : false;
  try {
    const m = await getGuildMember(discordId);
    v = Array.isArray(m?.roles) && m.roles.some((r) => SCOPED_ROLE_IDS.includes(String(r)));
    scopedCache.set(discordId, { v, at: Date.now() });
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
  const scopedGroup = await liveScoped(payload.id, level);
  if (level <= 0 && !scopedGroup) return null; // no access at all -> treat as signed out
  const eff = level > 0 ? level : 1; // scoped-only users (e.g. Leaderboard HR) get base level to navigate
  return { ...payload, level: eff, role: labelForLevel(eff), scopedGroup };
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
