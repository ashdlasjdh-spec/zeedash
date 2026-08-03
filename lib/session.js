import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "./db";
import { roleFromDiscord } from "./discord";
import { rank } from "./permissions";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-insecure-secret-change-me");
const COOKIE = "zhd_session";

export async function createSession(user) {
  const token = await new SignJWT({ id: user.id, name: user.name, role: user.role, avatar: user.avatar })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  cookies().set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export function clearSession() { cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 }); }
export async function getSession() {
  const token = cookies().get(COOKIE)?.value; if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret()); return payload; } catch { return null; }
}

// Priority: your real rank first (DB whitelist override, else Discord role), and
// BOOTSTRAP_OWNER_IDS only as a break-glass fallback so you can still get in with
// no roles set. This way your actual Discord rank (e.g. cofounder) is what shows.
export async function resolveRole(discordId) {
  let dbRole = null;
  try { const rows = await query("select role from whitelist where discord_id=$1", [discordId]); dbRole = rows[0]?.role || null; } catch {}

  let discordRole = null;
  try { discordRole = await roleFromDiscord(discordId); } catch {}

  // take the higher of the two (DB override can promote; Discord role is the base)
  let role = null;
  if (dbRole && discordRole) role = rank(dbRole) >= rank(discordRole) ? dbRole : discordRole;
  else role = dbRole || discordRole || null;
  if (role) return role;

  // break-glass: bootstrap owners always get in, even before any role is mapped.
  const owners = (process.env.BOOTSTRAP_OWNER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return owners.includes(discordId) ? "owner" : null;
}
