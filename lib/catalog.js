// power/stand -> DiscordAdminPowerGrant (AdminPowers, same store as the bot).
// gamepass/tool/armor -> perks table via perks-api (same DB as the bot). tag -> crew_tags. emoji -> datastore.
export const CATALOG = {
  power: [
    { key: "_EveryPower", name: "★ All Powers" },
    { key: "ACT4", name: "ACT4 (SVJ)" }, { key: "Shazam", name: "Shazam" }, { key: "Magic", name: "Magic" },
    { key: "Flash", name: "Flash" }, { key: "ReverseFlash", name: "Reverse Flash" },
    { key: "Batman", name: "Batman" }, { key: "SpiderMan", name: "Spider-Man" },
    { key: "Venom", name: "Venom" }, { key: "Wolverine", name: "Wolverine" },
    { key: "RedHulk", name: "Red Hulk" }, { key: "Joker", name: "Joker" },
    { key: "GreenGoblin", name: "Green Goblin" }, { key: "GreenLantern", name: "Green Lantern" },
    { key: "GreenLanternFemale", name: "Green Lantern ♀" }, { key: "Invincible", name: "Invincible" },
    { key: "Nightwing", name: "Nightwing" }, { key: "CatWoman", name: "Catwoman" },
    { key: "Blackpanther", name: "Black Panther" }, { key: "BlackPower", name: "Black Power" },
    { key: "Ghost", name: "Ghost" }, { key: "Scorpion", name: "Scorpion" },
    { key: "OPKatana", name: "OP Katana" }, { key: "Fly", name: "Fly" },
    { key: "PurpleFlameOn", name: "Purple Flame" }, { key: "OrangeFlameOn", name: "Orange Flame" },
  ],
  stand: [
    { key: "TW", name: "The World" }, { key: "WonderOfU", name: "Wonder of U" }, { key: "D4C", name: "D4C" },
  ],
  gamepass: [
    { key: "Mask", name: "Mask" }, { key: "AimLock", name: "Aim Lock" }, { key: "Aimviewer", name: "Aim Viewer" },
    { key: "SpawnFood", name: "Spawn with Food" }, { key: "SpawnStim", name: "Spawn with Stim" }, { key: "SpawnCookie", name: "Spawn with Cookie" },
  ],
  tool: [
    { key: "Katana", name: "Katana" },
  ],
  perk: [
    { key: "Armor", name: "Armor (max)" },
  ],
};
export function findItem(category, key) { return (CATALOG[category] || []).find((i) => i.key === key); }
