// Permission model — mirrors the bot's numeric level ladder (zee-hood-bot/permissions.js).
// A member's LEVEL = the highest level among their Discord roles, via DISCORD_ROLE_MAP
// (which now maps "<discordRoleId>": <level 0-255>). Capability thresholds match the bot,
// so the website and the bot whitelist the exact same way.

export const LVL = {
  PERKS: 247,       // staff advisor+ : grant powers / stands / SVJ car / tools / gamepasses / shazam variants
  TAGEMOJI: 254,    // co founders+   : crew tags + custom emojis (co founders can do everything)
  MANAGE: 242,      // head of staff+ : group management (rank / promote / demote / accept / decline / kick / shout)
  MASS: 248,        // overseer+      : bulk group ops (accept-all / decline-all)
  LEADERSHIP: 251,  // co owners+     : dashboard whitelist + settings
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

const PERK_CATS = new Set(["power", "stand", "car", "tool", "gamepass", "shazam"]);
export function can(level, category) {
  level = Number(level) || 0;
  if (PERK_CATS.has(category)) return level >= LVL.PERKS;
  if (category === "startbr") return level >= LVL.LEADERSHIP; // co owners+ may grant BR-start perms
  if (category === "tag" || category === "emoji") return level >= LVL.TAGEMOJI;
  return false;
}
export function canGroup(level)     { level = Number(level) || 0; return level >= LVL.MANAGE || MANAGE_EXTRA.includes(level); }
export function canGroupMass(level) { return (Number(level) || 0) >= LVL.MASS; }
export function canConfig(level)    { return (Number(level) || 0) >= LVL.LEADERSHIP; }
export function canWhitelist(level) { return (Number(level) || 0) >= LVL.LEADERSHIP; }
// Co founders+ (254) may LOAD the "who has this" lists and remove other people's
// grants. Lower ranks that can still grant (247+) can only add/revoke by name.
export function canManageGrants(level) { return (Number(level) || 0) >= LVL.TAGEMOJI; }

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
