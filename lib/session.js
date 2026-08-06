import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "./db";
import { levelFromDiscord } from "./discord";
import { labelForLevel } from "./permissions";

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

export async function getSession() {
  const token = cookies().get(COOKIE)?.value; if (!token) return null;
  let payload;
  try { ({ payload } = await jwtVerify(token, secret())); } catch { return null; }
  const level = await liveLevel(payload.id, payload.level);
  if (level <= 0) return null; // lost all access since login -> treat as signed out
  return { ...payload, level, role: labelForLevel(level) };
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
