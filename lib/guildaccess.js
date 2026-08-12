import { query } from "./db";
import { canManageGuild, guildOwnerOf, staffCanManageSecurity } from "./permissions";

// Security access (Antinuke / Antiraid) for a guild: the guild OWNER, an antinuke ADMIN (added by
// the owner via /antinuke admin, stored in the antinuke config), or top Roblox staff (co-owners+).
// A plain Discord Administrator does NOT qualify — matching the bot's owner-only antinuke command.
export async function canManageSecurity(session, guildId) {
  if (!session || !guildId) return false;
  if (staffCanManageSecurity(session.level)) return true;
  if (guildOwnerOf(session, guildId)) return true;
  try {
    const rows = await query("select config from guild_settings where guild_id=$1 and feature='antinuke'", [guildId]);
    const admins = String(rows[0]?.config?.admins || "").split(/[\s,]+/).filter(Boolean);
    return admins.includes(String(session.id));
  } catch { return false; }
}

// Combined access snapshot for a guild — used by /api/guild-access and to gate the UI.
export async function guildAccess(session, guildId) {
  const manage = canManageGuild(session, guildId);
  const security = manage ? await canManageSecurity(session, guildId) : false;
  return { manage, security, owner: guildOwnerOf(session, guildId) };
}
