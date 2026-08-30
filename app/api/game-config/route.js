import { query, ensureSchema } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import { GAME_DEFAULTS, clean } from "@/lib/gameDefaults";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Editable content for the public game site (zeehood.org). Super owners edit it on the dashboard
// (/dashboard/game-site); the game site fetches the GET below (public, cached) and falls back to its
// bundled defaults if this is ever unreachable. Stored in config.game_site. The defaults + sanitizer
// live in lib/gameDefaults.mjs (pure, unit-tested; kept in sync with the game site's bundled fallbacks
// via a shared snapshot — see test/game-defaults.snapshot.json).

// After a save, ask the game site to purge its cache now so the edit is live in seconds instead of
// waiting out the ISR window. Best-effort and time-boxed — a save never fails or hangs on this, and if
// the env isn't configured it's simply skipped (the site still refreshes on its own timer).
async function pingGameSiteRevalidate() {
  const url = process.env.GAME_SITE_REVALIDATE_URL; // e.g. https://zeehood.org/api/revalidate
  const secret = process.env.GAME_SITE_REVALIDATE_SECRET;
  if (!url || !secret) return;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    await fetch(url, { method: "POST", headers: { authorization: `Bearer ${secret}` }, signal: ctrl.signal }).catch(() => {});
    clearTimeout(t);
  } catch { /* ignore — ISR still refreshes */ }
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
// `?defaults=1` returns the pristine built-in defaults (used by the editor's "Reset" button); it's not
// cached so a reset always reflects the current shipped defaults.
export async function GET(req) {
  const wantDefaults = new URL(req.url).searchParams.get("defaults") === "1";
  if (wantDefaults) {
    return NextResponse.json({ ...GAME_DEFAULTS }, { headers: { "cache-control": "no-store" } });
  }
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
    await pingGameSiteRevalidate(); // make the edit live now (best-effort)
    return NextResponse.json({ ok: true, config: cfg });
  } catch (e) {
    console.error("[game-config] save:", e?.message || e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
