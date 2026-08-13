import { query } from "./db";
import {
  guildOwnerOf, isSecurityFeature, guildAdminOf,
  hasManualPerm, featurePerm, manageableFeatures,
} from "./permissions";

// Security access (Antinuke / Antiraid) for a guild: the guild OWNER, or an antinuke ADMIN (added by
// the owner via /antinuke admin, stored in the antinuke config). A plain Discord Administrator does
// NOT qualify, and neither does any manual ("fake") permission — matching the bot's owner-only antinuke
// command. The Roblox ladder grants nothing here. This reads the antinuke config fresh so a just-added
// admin gets in without waiting for their session cache to refresh (it's the authoritative write gate).
export async function canManageSecurity(session, guildId) {
  if (!session || !guildId) return false;
  if (session.isOwner) return true; // super owners manage security everywhere
  if (guildOwnerOf(session, guildId)) return true;
  try {
    const rows = await query("select config from guild_settings where guild_id=$1 and feature='antinuke'", [guildId]);
    const admins = String(rows[0]?.config?.admins || "").split(/[\s,]+/).filter(Boolean);
    return admins.includes(String(session.id));
  } catch { return false; }
}

// The authoritative write gate for one feature in one guild. Security features go through the antinuke
// path (fresh DB); non-security features are Discord admin/owner OR a manual permission that unlocks
// the feature (from the session, resolved in getSession). Used by the guild-settings API on read+write.
export async function canEditFeature(session, guildId, feature) {
  if (!session || !guildId) return false;
  if (isSecurityFeature(feature)) return canManageSecurity(session, guildId);
  if (guildAdminOf(session, guildId)) return true;
  return hasManualPerm(session, guildId, featurePerm(feature));
}

// Combined access snapshot for a guild — used by /api/guild-access and to gate the UI.
//   manage     : holds Discord admin/owner of this guild (can manage every non-security feature)
//   security   : may manage antinuke/antiraid (guild owner or antinuke admin)
//   owner      : is the guild owner
//   manageable : the non-security feature slugs this user may manage (all of them for an admin, or the
//                subset a manual-permission holder's perms unlock) — drives per-feature nav visibility
export async function guildAccess(session, guildId) {
  const manage = guildAdminOf(session, guildId);
  const security = await canManageSecurity(session, guildId);
  return { manage, security, owner: guildOwnerOf(session, guildId), manageable: manageableFeatures(session, guildId) };
}
