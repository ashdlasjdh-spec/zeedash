import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "./db";
import { levelFromDiscord } from "./discord";
import { labelForLevel } from "./permissions";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-insecure-secret-change-me");
const COOKIE = "zhd_session";

export async function createSession(user) {
  const token = await new SignJWT({ id: user.id, name: user.name, level: user.level, role: user.role, avatar: user.avatar })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  cookies().set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export function clearSession() { cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 }); }
export async function getSession() {
  const token = cookies().get(COOKIE)?.value; if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret()); return payload; } catch { return null; }
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
