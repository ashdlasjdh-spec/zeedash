// Editable content for the public game site (zeehood.org) and the sanitizer that coerces stored/submitted
// values into the exact shape the site expects. Pure (no Next / DB imports) so it can be unit-tested and
// imported by the route handler. The game site (zee-hood-game/app/defaults.mjs) ships bundled fallbacks
// that MUST mirror GAME_DEFAULTS; both repos pin to a shared snapshot (test/game-defaults.snapshot.json)
// with a matching test, so a change on one side that isn't mirrored fails a build.
//
// Defaults mirror what the game site currently ships, so the very first load of the editor shows the
// real, live content instead of blanks.
export const GAME_DEFAULTS = {
  gameUrl: "https://www.roblox.com/games/134743974543044/Zee",
  placeId: "134743974543044",
  discordUrl: "https://discord.gg/zhd",
  // Landing-page hero subtitle under the "Zee Hood" title.
  tagline: "A remade Da Hood experience on Roblox",
  // Optional site-wide banner shown at the top of the landing page. Empty = hidden.
  announcement: "",
  // Extra link buttons (group page, YouTube, TikTok, …) — [label, url] rows. Discord stays its own field.
  socials: [],
  // Landing hero title (the big word under the logo).
  heroTitle: "Zee Hood",
  // Show the live player-count / visits bar on the landing.
  liveStats: true,
  // Shared purchase line + button label on the Roles / Powers / Shop pages.
  purchaseNote: "Purchases are handled in our Discord.",
  buyLabel: "Buy via Discord",
  passes: [
    { id: "1952883102", item: "Aimview" },
    { id: "1952247201", item: "Armor" },
    { id: "1954788585", item: "Katana" },
    { id: "1955772531", item: "Mask" },
    { id: "1954662623", item: "Stim" },
    { id: "1954024780", item: "Food" },
    { id: "1951935469", item: "Cookie" },
  ],
  roles: [
    ["Trial Moderator", "$35"], ["Moderator", "$50"], ["Head Moderator", "$70"],
    ["Admin", "$85"], ["Head Admin", "$105"], ["Head of Staff", "$170"],
    ["Server Manager", "$240"], ["Management", "$300"], ["Head Management", "$410"],
    ["Staff Advisor", "$550"], ["Overseer", "$700"], ["Director", "$950"], ["Co-Owner", "$2,000"],
  ],
  // Shop extras — [name, price] rows, same shape as roles.
  shop: [
    ["Crew Tag", "$10"], ["Crew Tag + Icon", "$15"], ["Ingame Emoji", "$5"],
    ["Star Rank", "$30"], ["Content Creator Rank", "$15"],
  ],
  // [category, [ [name, price, unavailable?], ... ]]
  powers: [
    ["Spiderman", [["Spiderman", "$150"]]],
    ["ACT4", [["TA4", "$200", true]]],
    ["Batman", [["Batarang", "$80", true], ["Grapple Hook", "$95"], ["Glide", "$90"]]],
    ["Catwoman", [["Catwoman Whip", "$50"], ["Cat Speed", "$75"]]],
    ["Joker", [["Escape", "$90"], ["Joker Speed", "$75"], ["Cards", "$100", true]]],
    ["Reverse Flash", [["Reverse Flash Outfit", "$125", true], ["Dash Punch", "$85"], ["Speed Force", "$85"]]],
    ["Ghost", [["Ghost", "$150", true], ["Ghost Ray", "$100"], ["Fly", "$100"]]],
    ["Green Goblin", [["Goblin Grenade", "$100"], ["Goblin Glider", "$140"]]],
    ["Green Lantern", [["Energy Hammer", "$125", true]]],
    ["Invincible", [["Super Punch", "$85"], ["Fly", "$100"]]],
    ["BlackPower", [["Mjolnir", "$150", true], ["DooM", "$250"]]],
    ["Purple Flame", [["Fire Power", "$70"]]],
    ["Orange Flame", [["Fire Power", "$70"], ["Fly", "$100"]]],
    ["Bat", [["Admin Bat", "$300"]]],
    ["Nightwing", [["Batarang", "$75"], ["Grapple Hook", "$90"]]],
    ["OP Katana", [["OP Katana", "$300"]]],
    ["River", [["River", "$300"], ["OP Katana", "$300"]]],
    ["Scorpion", [["Scorpion", "$175", true]]],
    ["Whip", [["Catwoman Whip", "$45"]]],
    ["Character Powers", [["Flash", "$300"], ["Black Panther", "$175"], ["Green Lantern (Male)", "$200"], ["Magic", "$300"], ["TW (The World)", "$600"]]],
    ["Shazam Variants", [["Orange", "$200"], ["Black Adam", "$200"], ["Superman", "$200"], ["Green", "$200"], ["Blue", "$200"], ["White", "$200"], ["Red", "$200"], ["Black", "$200"], ["Purple", "$200"], ["Justice", "$200"], ["Draco", "$200"], ["Benoxa", "$250"], ["Ellie", "$250"]]],
  ],
};

// Coerce whatever is stored/submitted into the exact, safe shape the game site expects. Anything
// malformed falls back to the default for that field, so a bad edit can never break the site.
export function clean(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  const str = (v, d, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : d);
  const out = {
    gameUrl: str(c.gameUrl, GAME_DEFAULTS.gameUrl),
    placeId: /^\d{1,20}$/.test(String(c.placeId || "")) ? String(c.placeId) : GAME_DEFAULTS.placeId,
    discordUrl: str(c.discordUrl, GAME_DEFAULTS.discordUrl),
    tagline: str(c.tagline, GAME_DEFAULTS.tagline, 160),
    // Announcement may be intentionally empty (hidden) — trim + cap, don't fall back to a default.
    announcement: typeof c.announcement === "string" ? c.announcement.trim().slice(0, 240) : GAME_DEFAULTS.announcement,
    socials: Array.isArray(c.socials)
      ? c.socials
          .map((r) => (Array.isArray(r) ? [str(r[0], "", 40), str(r[1], "", 300)] : null))
          .filter((r) => r && r[0] && r[1])
          .slice(0, 10)
      : GAME_DEFAULTS.socials,
    heroTitle: str(c.heroTitle, GAME_DEFAULTS.heroTitle, 60),
    liveStats: c.liveStats !== false, // default on
    purchaseNote: str(c.purchaseNote, GAME_DEFAULTS.purchaseNote, 160),
    buyLabel: str(c.buyLabel, GAME_DEFAULTS.buyLabel, 40),
    passes: Array.isArray(c.passes)
      ? c.passes
          .map((p) => ({ id: String(p?.id || "").replace(/\D/g, ""), item: str(p?.item, "", 80) }))
          .filter((p) => p.id && p.item)
          .slice(0, 60)
      : GAME_DEFAULTS.passes,
    roles: Array.isArray(c.roles)
      ? c.roles
          .map((r) => (Array.isArray(r) ? [str(r[0], "", 80), str(r[1], "", 40)] : null))
          .filter((r) => r && r[0])
          .slice(0, 100)
      : GAME_DEFAULTS.roles,
    shop: Array.isArray(c.shop)
      ? c.shop
          .map((r) => (Array.isArray(r) ? [str(r[0], "", 80), str(r[1], "", 40)] : null))
          .filter((r) => r && r[0])
          .slice(0, 100)
      : GAME_DEFAULTS.shop,
    powers: Array.isArray(c.powers)
      ? c.powers
          .map((cat) => {
            if (!Array.isArray(cat)) return null;
            const name = str(cat[0], "", 80);
            const items = Array.isArray(cat[1])
              ? cat[1]
                  .map((it) => (Array.isArray(it) ? [str(it[0], "", 80), str(it[1], "", 40), !!it[2]] : null))
                  .filter((it) => it && it[0])
                  .slice(0, 60)
              : [];
            return name ? [name, items] : null;
          })
          .filter(Boolean)
          .slice(0, 80)
      : GAME_DEFAULTS.powers,
  };
  return out;
}
