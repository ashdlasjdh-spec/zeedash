export const ROLES = ["staff", "admin", "cofounder", "owner"];
export const rank = (role) => ROLES.indexOf(role);

export const PERMISSIONS = {
  staff:     { grant: ["tag", "emoji", "gamepass"],                          group: false, config: false, whitelist: false },
  admin:     { grant: ["tag", "emoji", "gamepass", "perk", "tool", "power", "stand"], group: true,  config: false, whitelist: false },
  cofounder: { grant: ["tag", "emoji", "gamepass", "perk", "tool", "power", "stand"], group: true,  config: true,  whitelist: true  },
  owner:     { grant: ["tag", "emoji", "gamepass", "perk", "tool", "power", "stand"], group: true,  config: true,  whitelist: true  },
};
export function can(role, category) { const p = PERMISSIONS[role]; return !!p && p.grant.includes(category); }
export function canGroup(role)     { return !!PERMISSIONS[role]?.group; }
export function canConfig(role)    { return !!PERMISSIONS[role]?.config; }
export function canWhitelist(role) { return !!PERMISSIONS[role]?.whitelist; }
export function isCofounderPlus(role) { return rank(role) >= rank("cofounder"); }
