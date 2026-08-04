// Verified against the live game.
// power -> DiscordAdminPowerGrantV1 | gamepass -> DiscordAdminGrantV1
// stand/car -> DashboardGrant -> _G.DashboardGrants:HasGrant -> StandsHandler / SVJCarManager on spawn
export const CATALOG = {
  startbr: [
    { key: "StartBR", name: "Start BR (/startbr)" },
  ],
  power: [
    { key: "_EveryPower", name: "★ All Powers" },
    { key: "ACT4", name: "ACT4" }, { key: "Batman", name: "Batman" },
    { key: "SpiderMan", name: "Spider-Man" }, { key: "RedHulk", name: "Red Hulk" },
    { key: "Joker", name: "Joker" }, { key: "GreenGoblin", name: "Green Goblin" },
    { key: "GreenLanternMale", name: "Green Lantern ♂" }, { key: "GreenLanternFemale", name: "Green Lantern ♀" },
    { key: "Invincible", name: "Invincible" }, { key: "Nightwing", name: "Nightwing" },
    { key: "CatWoman", name: "Catwoman" }, { key: "BlackPower", name: "Black Power" },
    { key: "Ghost", name: "Ghost" }, { key: "ReverseFlash", name: "Reverse Flash" },
    { key: "OPKatana", name: "OP Katana" },
    // Whitelist-gated powers (WhitelistTools table) — grantable via
    // DashboardWhitelistSync.lua + the DashboardWhitelist DataStore.
    { key: "Flash", name: "Flash" }, { key: "Fly", name: "Fly" },
    { key: "Magic", name: "Magic" },
    { key: "OrangeFlameOn", name: "Orange Flame" }, { key: "PurpleFlameOn", name: "Purple Flame" },
    { key: "escape", name: "Escape" }, { key: "river", name: "River" },
    { key: "scorpion", name: "Scorpion" }, { key: "whip", name: "Whip" },
  ],
  stand: [
    { key: "SoftAndWet", name: "Soft & Wet" }, { key: "TheWorld", name: "The World" },
    { key: "StarPlatinum", name: "Star Platinum" }, { key: "WonderOfU", name: "Wonder of U" },
    { key: "D4C", name: "D4C" },
  ],
  car: [
    { key: "SVJCar", name: "SVJ Car" },
  ],
  // Shazam variants — EXACT names ShazamManager/PerkReceiver match on
  // (PerkReceiver.lua SHAZAM_VARIANTS). Delivered via the PlayerPerks
  // DataStore (applies on spawn) + a DashboardGrant publish (applies live).
  shazam: [
    { key: "Orange", name: "Orange" }, { key: "BlackAdam", name: "Black Adam" },
    { key: "Superman", name: "Superman" }, { key: "Green", name: "Green" },
    { key: "Blue", name: "Blue" }, { key: "White", name: "White" },
    { key: "Red", name: "Red" }, { key: "Black", name: "Black" },
    { key: "Purple", name: "Purple" }, { key: "Justice", name: "Justice" },
    { key: "Draco", name: "Draco" }, { key: "Benoxa", name: "Benoxa" },
    { key: "Ellie", name: "Ellie" },
  ],
  tool: [
    { key: "AdminBat", name: "AdminBat" },
    { key: "Batarang", name: "Batarang" },
    { key: "BatmanOutfit", name: "BatmanOutfit" },
    { key: "Cards", name: "Cards" },
    { key: "Cat Speed", name: "Cat Speed" },
    { key: "CatwomanWhip", name: "CatwomanWhip" },
    { key: "Cuff", name: "Cuff" },
    { key: "D4C", name: "D4C" },
    { key: "Dash Punch", name: "Dash Punch" },
    { key: "Energy Hammer", name: "Energy Hammer" },
    { key: "EnergyBeam", name: "EnergyBeam" },
    { key: "Escape", name: "Escape" },
    { key: "FirePower", name: "FirePower" },
    { key: "FlashTransformation", name: "FlashTransformation" },
    { key: "Flight", name: "Flight" },
    { key: "Fly", name: "Fly" },
    { key: "Ghost", name: "Ghost" },
    { key: "Ghost Ray", name: "Ghost Ray" },
    { key: "Glide", name: "Glide" },
    { key: "GoblinGlider", name: "GoblinGlider" },
    { key: "GoblinGrenade", name: "GoblinGrenade" },
    { key: "GrappleHook", name: "GrappleHook" },
    { key: "GreenGoblinOutfit", name: "GreenGoblinOutfit" },
    { key: "GreenLanternOutfit", name: "GreenLanternOutfit" },
    { key: "Hearing", name: "Hearing" },
    { key: "InvincibleOutfit", name: "InvincibleOutfit" },
    { key: "Joker Speed", name: "Joker Speed" },
    { key: "JokerCard", name: "JokerCard" },
    { key: "JokerOutfit", name: "JokerOutfit" },
    { key: "Laser Eyes", name: "Laser Eyes" },
    { key: "Lightning Smite", name: "Lightning Smite" },
    { key: "ReverseFlashOutfit", name: "ReverseFlashOutfit" },
    { key: "SpeedForce", name: "SpeedForce" },
    { key: "Spiderman", name: "Spiderman" },
    { key: "SuperPunch", name: "SuperPunch" },
    { key: "TA4", name: "TA4" },
    { key: "Thunder Clap", name: "Thunder Clap" },
    { key: "Titan", name: "Titan" },
    { key: "Wonder of U", name: "Wonder of U" },
  ],
  gamepass: [
    { key: "Katana", name: "Katana" }, { key: "Armor", name: "Armor" }, { key: "Mask", name: "Mask" },
    { key: "AimLock", name: "Aim Lock" }, { key: "Aimviewer", name: "Aim Viewer" },
    { key: "SpawnFood", name: "Spawn with Food" }, { key: "SpawnStim", name: "Spawn with Stim" }, { key: "SpawnCookie", name: "Spawn with Cookie" },
  ],
};
export function findItem(category, key) { return (CATALOG[category] || []).find((i) => i.key === key); }
