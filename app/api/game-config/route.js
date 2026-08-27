import { query, ensureSchema } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Editable content for the public game site (zeehood.org). Super owners edit it on the dashboard
// (/dashboard/game-site); the game site fetches the GET below (public, cached) and falls back to its
// bundled defaults if this is ever unreachable. Stored in config.game_site.
//
// Defaults mirror what the game site currently ships, so the very first load of the editor shows the
// real, live content instead of blanks.
export const GAME_DEFAULTS = {
  gameUrl: "https://www.roblox.com/games/122577517724086/Zee",
  placeId: "122577517724086",
  discordUrl: "https://discord.gg/zhd",
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
function clean(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  const str = (v, d, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : d);
  const out = {
    gameUrl: str(c.gameUrl, GAME_DEFAULTS.gameUrl),
    placeId: /^\d{1,20}$/.test(String(c.placeId || "")) ? String(c.placeId) : GAME_DEFAULTS.placeId,
    discordUrl: str(c.discordUrl, GAME_DEFAULTS.discordUrl),
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

async function readConfig() {
  try {
    const rows = await query("select value from config where key = 'game_site'");
    if (rows[0]?.value) return clean(JSON.parse(rows[0].value));
  } catch { /* DB down / not set — defaults */ }
  return { ...GAME_DEFAULTS };
}

// Public read — the game site fetches this. Cacheable so it doesn't hammer the DB; the game site also
// caches it with ISR. No secrets here, it's the same content the public site already renders.
export async function GET() {
  const cfg = await readConfig();
  return NextResponse.json(cfg, {
    headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

// Owner-only save.
export async function POST(req) {
  const session = await getSession();
  if (!session || !isSuperOwner(session.id)) {
    return NextResponse.json({ error: "Owner only." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  const cfg = clean(body);
  try {
    await ensureSchema();
    await query(
      `insert into config (key, value, updated_by, updated_at) values ('game_site', $1, $2, now())
       on conflict (key) do update set value = $1, updated_by = $2, updated_at = now()`,
      [JSON.stringify(cfg), String(session.id)],
    );
    return NextResponse.json({ ok: true, config: cfg });
  } catch (e) {
    console.error("[game-config] save:", e?.message || e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
