// Permission model — mirrors the bot's numeric level ladder (zee-hood-bot/permissions.js).
// A member's LEVEL = the highest level among their Discord roles, via DISCORD_ROLE_MAP
// (which now maps "<discordRoleId>": <level 0-255>). Capability thresholds match the bot,
// so the website and the bot whitelist the exact same way.
import { NONSECURITY_FEATURES } from "./serverFeatures.js";

export const LVL = {
  PERKS: 247,       // staff advisor+ : grant gamepasses
  TAGEMOJI: 254,    // co founders+   : crew tags + custom emojis (co founders can do everything)
  MANAGE: 242,      // head of staff+ : group management (rank / promote / demote / accept / decline / kick / shout)
  MASS: 248,        // overseer+      : bulk group ops (accept-all / decline-all)
  LEADERSHIP: 251,  // co owners+     : SVJ car / tools / stands / powers / shazam / start-BR + dashboard whitelist + settings
  BAN: 238,         // mod+           : ban / unban players from the game (change this number to adjust who can ban)
};
// Two extra low staff roles the bot also lets run group-management commands.
export const MANAGE_EXTRA = [234, 235]; // host + content creator manager

// discordRoleId -> level. Highest wins.
export function roleMap() {
  try { return JSON.parse(process.env.DISCORD_ROLE_MAP || "{}"); } catch { return {}; }
}
export function levelFromRoles(roleIds) {
  const map = roleMap();
  let lvl = 0;
  for (const id of roleIds || []) { const l = Number(map[id]); if (Number.isFinite(l)) lvl = Math.max(lvl, l); }
  return lvl;
}

// Staff advisor+ (247): gamepasses only.
const PERK_STAFFADV = new Set(["gamepass"]);
// Co owners+ (251): SVJ car, tools, stands, powers, shazam, and BR-start perms.
const PERK_COOWNER = new Set(["car", "tool", "stand", "power", "shazam", "startbr"]);
export function can(level, category) {
  level = Number(level) || 0;
  if (PERK_STAFFADV.has(category)) return level >= LVL.PERKS;
  if (PERK_COOWNER.has(category)) return level >= LVL.LEADERSHIP;
  if (category === "tag" || category === "emoji") return level >= LVL.TAGEMOJI;
  return false;
}
export function canGroup(level)     { level = Number(level) || 0; return level >= LVL.MANAGE || MANAGE_EXTRA.includes(level); }
// Limited group access for a low staff role (e.g. "Leaderboard HR"): may rank people TO, and
// kick people who currently hold, the crew-leader / leaderboard-staff group ranks — and nothing
// else. Set GROUP_SCOPED_LEVELS to the Discord level(s) that get this (from your DISCORD_ROLE_MAP).
export const GROUP_SCOPED_LEVELS = (process.env.GROUP_SCOPED_LEVELS || "")
  .split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n));
export function canGroupScoped(level) { return GROUP_SCOPED_LEVELS.includes(Number(level) || 0); }
// True for someone who has the LIMITED access but not full group management.
export function isGroupScopedOnly(level) { return canGroupScoped(level) && !canGroup(level); }
// Any group access at all (full or scoped) — drives the sidebar/nav visibility.
export function canGroupAny(level) { return canGroup(level) || canGroupScoped(level); }
// The group ranks a scoped user (Leaderboard HR) may assign / kick, matched by role name.
export const SCOPED_RANK_RE = /crew\s*lead|leaderboard|star/i;
export function isScopedRankName(name) { return SCOPED_RANK_RE.test(String(name || "")); }

// Per-scope rank patterns for the website. "all" = the full Leaderboard-HR scope; "star" / "crew"
// are the narrower single-rank scopes (Star Overseer → stars only, Crew Manager → crew leaders only).
export const SCOPE_PATTERNS = {
  all: /crew\s*lead|leaderboard|star/i,
  star: /star/i,
  crew: /crew\s*lead/i,
  lbhr: /crew\s*lead|leaderboard/i, // crew leaders + leaderboard staff (no stars)
};
// Scopes that may ONLY kick within their ranks (not rank/accept). e.g. the staff "Leaderboard HR".
export const KICK_ONLY_SCOPES = new Set(["lbhr"]);
export function isKickOnlyScope(scope) {
  const keys = Array.isArray(scope) ? scope : scope ? [scope] : [];
  return keys.length > 0 && keys.every((k) => KICK_ONLY_SCOPES.has(k));
}
// Does the given scope (a key or array of keys) permit acting on a rank with this name?
export function scopeMatches(scope, name) {
  const keys = Array.isArray(scope) ? scope : scope ? [scope] : [];
  const s = String(name || "");
  return keys.some((k) => SCOPE_PATTERNS[k] && SCOPE_PATTERNS[k].test(s));
}
export function scopeLabel(scope) {
  const keys = Array.isArray(scope) ? scope : scope ? [scope] : [];
  if (keys.includes("all")) return "Crew Leader / Leaderboard Staff / Star";
  const parts = [];
  if (keys.includes("crew")) parts.push("Crew Leader");
  if (keys.includes("star")) parts.push("Star");
  return parts.join(" / ") || "your assigned";
}
// ---- Server Management section (per-Discord-server access; separate from the Roblox ladder) ----
// The Game/whitelist section is gated by the ladder above. The Server section is gated PURELY by the
// signed-in user's standing in EACH guild — the Roblox rank ladder grants NO access here. Three ways
// in, per guild:
//   1. Discord admin/owner of that guild (session.serverPerms)          -> manage every non-security feature.
//   2. A "manual" (fake) permission held via a role (session.manualPerms) -> manage only the feature(s)
//      that permission unlocks. "administrator" is the master key (all non-security features), matching
//      the bot, which lets those roles run its commands without real Discord admin.
//   3. The guild owner or a listed antinuke admin (session.securityGuildIds) -> the security features.
// A director in the main server with no standing in another server does not see that other server at all.
// The most destructive security features (antinuke/antiraid) are locked tighter still: ONLY the guild
// owner or an antinuke admin — never a plain Discord admin, and never a manual permission.
export const SECURITY_FEATURES = new Set(["antinuke", "antiraid"]);
export function isSecurityFeature(feature) { return SECURITY_FEATURES.has(String(feature || "")); }

// The manual ("fake") permission strings the fake-permissions feature maps roles to. Mirrors the set
// offered on the Fake Permissions page. "administrator" implies all of the others for our purposes.
export const MANUAL_PERMS = new Set([
  "administrator", "ban_members", "kick_members", "moderate_members",
  "manage_messages", "manage_roles", "manage_nicknames", "manage_channels",
  "manage_guild", "manage_webhooks", "manage_events", "manage_threads",
  "view_audit_log", "mention_everyone",
]);
// Friendly labels for the Fake Permissions page (and anywhere a perm is shown).
export const MANUAL_PERM_LABELS = {
  administrator: "Administrator", ban_members: "Ban members", kick_members: "Kick members",
  moderate_members: "Timeout members", manage_messages: "Manage messages", manage_roles: "Manage roles",
  manage_nicknames: "Manage nicknames", manage_channels: "Manage channels", manage_guild: "Manage server",
  manage_webhooks: "Manage webhooks", manage_events: "Manage events", manage_threads: "Manage threads",
  view_audit_log: "View audit log", mention_everyone: "Mention everyone",
};

// Every non-security feature slug in the Server section, and which single manual permission unlocks it.
// "administrator" ALWAYS unlocks everything, so this only needs to name the finer permission where one
// fits naturally; anything omitted requires "administrator" (i.e. it's admin-level server config). This
// is the one place to retune how granular manual access is — the API, nav and overview all read it.
export const FEATURE_PERM = {
  // content / message moderation -> Manage messages
  automod: "manage_messages", restrict: "manage_messages", logs: "manage_messages",
  autoresponder: "manage_messages", autoreact: "manage_messages", sticky: "manage_messages",
  starboard: "manage_messages", "message-builder": "manage_messages",
  // role management -> Manage roles
  autorole: "manage_roles", "button-roles": "manage_roles", "reaction-roles": "manage_roles",
  boosterrole: "manage_roles",
  // auto-ban / raid trap -> Ban members
  honeypot: "ban_members",
  // things that create/manage channels -> Manage channels
  voicemaster: "manage_channels", tickets: "manage_channels", counters: "manage_channels",
  // server configuration & engagement -> Manage server
  bump: "manage_guild", welcome: "manage_guild", goodbye: "manage_guild", aliases: "manage_guild",
  levels: "manage_guild", economy: "manage_guild", pingonjoin: "manage_guild", tracking: "manage_guild",
  autopfp: "manage_guild",
  // scheduled / event features -> Manage events
  giveaways: "manage_events", timers: "manage_events",
  // everything else (settings-general, customize, disable, fake-permissions) -> administrator (core config).
  // fake-permissions is handled specially in canManageFeature (security standing), never a manual perm.
};
// The full non-security feature list (drives "an admin can manage all of these"), derived from the
// single feature catalogue. Security slugs (antinuke/antiraid) are excluded — they go through the
// security path, not manual perms.
export { NONSECURITY_FEATURES };
export function featurePerm(feature) { return FEATURE_PERM[String(feature || "")] || "administrator"; }

// The manual permissions the session holds in a guild (resolved live in getSession from the guild's
// enabled fake-permissions config crossed with the user's roles there). Shape: string[] of perm keys.
export function manualPermsOf(session, guildId) {
  const v = session?.manualPerms?.[guildId];
  return Array.isArray(v) ? v : [];
}
// Does the session hold a manual permission that satisfies `perm` in this guild? "administrator" satisfies all.
export function hasManualPerm(session, guildId, perm) {
  const held = manualPermsOf(session, guildId);
  return held.includes("administrator") || held.includes(String(perm || ""));
}

// Features granted DIRECTLY to a role in a guild (the finest delegation: "this role can manage exactly
// Autorole + Tickets", independent of any Discord-permission bucket). Resolved in getSession from the
// fake-permissions config's per-role `features` list. Shape: string[] of feature slugs.
export function featurePermsOf(session, guildId) {
  const v = session?.featurePerms?.[guildId];
  return Array.isArray(v) ? v : [];
}
export function hasFeatureGrant(session, guildId, feature) {
  return featurePermsOf(session, guildId).includes(String(feature || ""));
}
// True if the session may manage a specific NON-SECURITY feature in a guild: Discord admin/owner, or a
// manual permission that unlocks it. Security features never resolve here — use canManageSecurity.
// The fake-permissions map itself is REAL-admin-only: a user elevated by a manual "administrator" perm
// must not be able to rewrite who holds manual perms (that would let manual admins mint more).
export function canManageFeature(session, guildId, feature) {
  if (!session || !guildId) return false;
  if (isSecurityFeature(feature)) return false; // security goes through the antinuke-admin path only
  // Fake permissions decides who the bot treats as staff, so it sits at security level: the guild
  // owner, a super owner, or a listed antinuke admin — never a plain Discord admin or a manual perm.
  if (String(feature) === "fake-permissions") return securityGuildOf(session, guildId);
  if (guildAdminOf(session, guildId)) return true;
  // A direct per-feature grant, OR a manual Discord-permission that unlocks the feature.
  return hasFeatureGrant(session, guildId, feature) || hasManualPerm(session, guildId, featurePerm(feature));
}
// The non-security feature slugs the session may manage in a guild — every one for a Discord admin,
// or just the subset a manual-permission holder's perms + direct grants unlock. Drives nav + overview
// visibility. fake-permissions is included when the user has security standing there.
export function manageableFeatures(session, guildId) {
  return NONSECURITY_FEATURES.filter((f) => canManageFeature(session, guildId, f));
}
// Is this guild one the session is an antinuke admin (or owner) of? Precomputed in getSession.
export function securityGuildOf(session, guildId) {
  return !!(guildOwnerOf(session, guildId) || (session?.securityGuildIds || []).includes(String(guildId)));
}
// ---- Super owners ("root") ----
// These Discord IDs can do ANYTHING on the dashboard regardless of their Discord/Roblox roles: top
// level (255), every grant, all group access, and full management of every server they're in —
// including the security features. Mirrors the bot's FULL_OWNERS. Extend via SUPER_OWNER_IDS (CSV).
export const SUPER_OWNER_IDS = (() => {
  const base = ["1526337145063735461", "183605754593411072", "562438384350527489", "1145835584112308294", "1226516379881046027", "1434685900704583770"];
  const extra = (process.env.SUPER_OWNER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...base, ...extra])];
})();
export function isSuperOwner(id) { return SUPER_OWNER_IDS.includes(String(id)); }

// Does this session hold Discord admin/owner in the given guild? (A super owner counts as both.)
export function guildAdminOf(session, guildId) {
  if (session?.isOwner) return true;
  const p = session?.serverPerms?.[guildId];
  return !!(p && (p.a || p.o));
}
export function guildOwnerOf(session, guildId) {
  if (session?.isOwner) return true;
  const p = session?.serverPerms?.[guildId];
  return !!(p && p.o);
}
// Manage a guild's non-security server settings — Discord admin/owner of THAT guild only.
export function canManageGuild(session, guildId) {
  if (!session || !guildId) return false;
  return guildAdminOf(session, guildId);
}
// Can the session reach the Server section at all (drives nav visibility)? True if they have ANY
// standing in at least one shared server — Discord admin/owner, a manual permission, or antinuke-admin
// (all three are unioned into serverGuildIds in getSession).
export function canAccessServerSection(session) {
  if (!session) return false;
  if (session.isOwner) return true;
  return (session.serverGuildIds?.length || 0) > 0;
}
// Can the session reach THIS specific guild's Server section (any standing there)? Gates the API.
export function canReachGuild(session, guildId) {
  if (!session || !guildId) return false;
  if (session.isOwner) return true;
  return (session.serverGuildIds || []).includes(String(guildId));
}

export function canGroupMass(level) { return (Number(level) || 0) >= LVL.MASS; }
export function canConfig(level)    { return (Number(level) || 0) >= LVL.LEADERSHIP; }
export function canWhitelist(level) { return (Number(level) || 0) >= LVL.TAGEMOJI; } // co founders+ (254)
// Single ban/unban/kick/warn is mod+ (238) — they can see & use the ban section.
export function canBan(level)       { return (Number(level) || 0) >= LVL.BAN; }
// Bulk ban/unban (pasted lists) is restricted to co owners+ (251).
export function canBulkBan(level)   { return (Number(level) || 0) >= LVL.LEADERSHIP; }
// Only co founders+ (254) may set the dedicated Bans API key in Settings.
export function canBanKey(level)    { return (Number(level) || 0) >= LVL.TAGEMOJI; }
// Co founders+ (254) may LOAD the "who has this" lists and remove other people's
// grants. Lower ranks that can still grant (247+) can only add/revoke by name.
export function canManageGrants(level) { return (Number(level) || 0) >= LVL.TAGEMOJI; }

// The "Remove All" page is a destructive mass-wipe, so it's gated to specific owner Discord
// IDs (NOT a rank). Locked to these two by default; extend via PURGE_OWNER_IDS (CSV) if needed.
export const PURGE_OWNER_IDS = (() => {
  const base = ["1526337145063735461", "183605754593411072", "562438384350527489", "1145835584112308294", "1226516379881046027", "1434685900704583770"];
  const extra = (process.env.PURGE_OWNER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...base, ...extra])];
})();
export function canPurge(discordId) { return isSuperOwner(discordId) || PURGE_OWNER_IDS.includes(String(discordId)); }

// The grant categories a level can use — drives which sidebar links / pages show.
export const GRANT_CATS = ["power", "stand", "car", "tool", "gamepass", "shazam", "startbr", "tag", "emoji"];
export function grantsFor(level) { return GRANT_CATS.filter((c) => can(level, c)); }

// ---- Role Access (Roblox GROUP management delegated to a Discord role) ----
// Role Access now maps a Discord role to GROUP management only — separate from, and on top of, the
// numeric level ladder, and separate from fake-permissions (which grants Server-portal features).
// A super owner picks, per role: (1) WHICH group actions the role may run, and (2) the HIGHEST group
// rank it may assign / accept people to — so a delegated manager can be allowed to rank people up to,
// say, Admin, but never to Co-Owner. Resolved live into session.group = { actions:[], maxRank:number }.
// (Grants / crew-tags / bans were removed from Role Access — granting moved to its own site.)
export const GROUP_ACTIONS = ["lookup", "rank", "promote", "demote", "accept", "decline", "kick", "shout", "acceptAll", "declineAll"];
export const GROUP_ACTION_LABELS = {
  lookup: "Look up members", rank: "Set rank", promote: "Promote", demote: "Demote",
  accept: "Accept requests", decline: "Decline requests", kick: "Kick / exile",
  shout: "Post group shout", acceptAll: "Accept ALL requests", declineAll: "Decline ALL requests",
};
// Actions that lift someone UP to a rank — these are the ones bounded by maxRank.
export const RANK_ASSIGN_ACTIONS = new Set(["rank", "promote", "accept", "acceptAll"]);

// The group access a session was granted via Role Access, or null. Shape: { actions:string[], maxRank:number|null }.
export function groupAccessOf(session) {
  const g = session?.group;
  if (!g || !Array.isArray(g.actions) || g.actions.length === 0) return null;
  const actions = g.actions.filter((a) => GROUP_ACTIONS.includes(a));
  if (!actions.length) return null;
  return { actions, maxRank: Number.isFinite(Number(g.maxRank)) ? Number(g.maxRank) : null };
}
export function hasGroupAction(session, action) {
  const g = groupAccessOf(session);
  return !!(g && g.actions.includes(action));
}

// Session-aware gates: pass the level check OR the delegated access. Grants/tags/bans no longer flow
// through Role Access (granting moved sites), so those stay purely level-gated.
export function canCat(session, category) { return can(session?.level, category); }
export function canBanS(session) { return canBan(session?.level); }
export function canWhitelistS(session) { return canWhitelist(session?.level); }
export function canManageGrantsS(session) { return canManageGrants(session?.level); }
// Group access: a full Roblox manager by rank, OR a role delegated group access via Role Access.
export function canGroupS(session) { return canGroup(session?.level) || !!groupAccessOf(session); }
export function grantsForSession(session) { return GRANT_CATS.filter((c) => canCat(session, c)); }
// Does this session have ANY game access at all (ladder level, scoped group, or delegated group access)?
export function hasGameAccess(session) {
  return !!(session?.isOwner || (Number(session?.level) || 0) > 0 || session?.scopedGroup || groupAccessOf(session));
}

// Ranks (level -> display name), highest first. Mirrors the bot's RANKS ladder — used
// for the sidebar pill and the whitelist dropdown.
export const RANKS = [
  { level: 255, name: "founders" }, { level: 254, name: "co founders" }, { level: 253, name: "owners" },
  { level: 252, name: "right hand man" }, { level: 251, name: "co owners" }, { level: 249, name: "director" },
  { level: 248, name: "overseer" }, { level: 247, name: "staff advisor" }, { level: 246, name: "head management" },
  { level: 245, name: "management" }, { level: 244, name: "server manager" }, { level: 243, name: "owner assistant" },
  { level: 242, name: "head of staff" }, { level: 241, name: "senior admin" }, { level: 240, name: "admin" },
  { level: 239, name: "head mod" }, { level: 238, name: "mod" }, { level: 237, name: "helpers" },
  { level: 236, name: "leaderboard staff" }, { level: 235, name: "content creator manager" }, { level: 234, name: "host" },
  { level: 14, name: "chat mod overseer" }, { level: 13, name: "chat mod supervisor" }, { level: 12, name: "chat mod manager" },
  { level: 11, name: "head chat moderator" }, { level: 10, name: "chat moderator" }, { level: 5, name: "verified pc checker" },
  { level: 1, name: "staff" },
];
export function labelForLevel(level) {
  level = Number(level) || 0;
  for (const r of RANKS) if (level >= r.level) return r.name;
  return "no access";
}
// Coarse colour bucket for the role pill CSS (role-owner / -cofounder / -admin / -staff).
export function pillClassForLevel(level) {
  level = Number(level) || 0;
  if (level >= LVL.LEADERSHIP) return "owner";
  if (level >= LVL.PERKS) return "cofounder";
  if (level >= LVL.MANAGE) return "admin";
  return "staff";
}
// A distinct, clean colour tone per rank tier (drives the .role-t-<tone> pill CSS) so every role reads
// at a glance instead of collapsing into four buckets. Highest tier wins.
export function roleTone(level) {
  level = Number(level) || 0;
  if (level >= 255) return "gold";    // founders
  if (level >= 254) return "pink";    // co founders
  if (level >= 253) return "red";     // owners
  if (level >= 252) return "orange";  // right hand man
  if (level >= 251) return "violet";  // co owners
  if (level >= 249) return "blue";    // director
  if (level >= 248) return "cyan";    // overseer
  if (level >= 247) return "green";   // staff advisor
  if (level >= 243) return "indigo";  // head management → owner assistant
  if (level >= 242) return "purple";  // head of staff
  if (level >= 238) return "sky";     // senior admin → mod
  if (level >= 234) return "teal";    // helpers → host
  if (level >= 10) return "slate";    // chat-mod tiers
  return "muted";                     // staff / verified / none
}
