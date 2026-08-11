// Permission model — mirrors the bot's numeric level ladder (zee-hood-bot/permissions.js).
// A member's LEVEL = the highest level among their Discord roles, via DISCORD_ROLE_MAP
// (which now maps "<discordRoleId>": <level 0-255>). Capability thresholds match the bot,
// so the website and the bot whitelist the exact same way.

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
  const base = ["1526337145063735461", "183605754593411072"];
  const extra = (process.env.PURGE_OWNER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...base, ...extra])];
})();
export function canPurge(discordId) { return PURGE_OWNER_IDS.includes(String(discordId)); }

// The grant categories a level can use — drives which sidebar links / pages show.
export const GRANT_CATS = ["power", "stand", "car", "tool", "gamepass", "shazam", "startbr", "tag", "emoji"];
export function grantsFor(level) { return GRANT_CATS.filter((c) => can(level, c)); }

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
