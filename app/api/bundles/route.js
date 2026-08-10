import { getSession } from "@/lib/session";
import { canConfig, can } from "@/lib/permissions";
import { setConfig } from "@/lib/config";
import { resolveUsername } from "@/lib/roblox";
import { applyGrant } from "@/lib/grantEngine";
import { query, logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Grant bundles = named sets of perks a co owner can apply to a player in one click. Stored in
// the shared `config` table under "grant_bundles" as JSON: [{ name, items: [{category, key}] }].
async function readBundles() {
  try { const rows = await query("select value from config where key = 'grant_bundles'"); return JSON.parse(rows[0]?.value || "[]"); }
  catch { return []; }
}

export async function GET() {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ bundles: await readBundles() });
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  if (body.action === "save") {
    const name = String(body.name || "").trim();
    const items = (Array.isArray(body.items) ? body.items : []).filter((i) => i && i.category && i.key);
    if (!name) return NextResponse.json({ error: "Bundle needs a name." }, { status: 400 });
    if (!items.length) return NextResponse.json({ error: "Add at least one item to the bundle." }, { status: 400 });
    const bundles = await readBundles();
    const idx = bundles.findIndex((b) => b.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) bundles[idx] = { name, items }; else bundles.push({ name, items });
    await setConfig("grant_bundles", JSON.stringify(bundles), s.id);
    return NextResponse.json({ ok: true, bundles });
  }

  if (body.action === "delete") {
    const name = String(body.name || "").trim().toLowerCase();
    const bundles = (await readBundles()).filter((b) => b.name.toLowerCase() !== name);
    await setConfig("grant_bundles", JSON.stringify(bundles), s.id);
    return NextResponse.json({ ok: true, bundles });
  }

  if (body.action === "apply") {
    const name = String(body.name || "").trim().toLowerCase();
    const username = String(body.username || "").trim();
    if (!username) return NextResponse.json({ error: "Enter a player." }, { status: 400 });
    const bundle = (await readBundles()).find((b) => b.name.toLowerCase() === name);
    if (!bundle) return NextResponse.json({ error: "No such bundle." }, { status: 404 });

    let user = await resolveUsername(username).catch(() => null);
    if (!user) return NextResponse.json({ error: "No such Roblox user." }, { status: 404 });

    let done = 0;
    const skipped = [], errors = [];
    for (const it of bundle.items) {
      if (!can(s.level, it.category)) { skipped.push(`${it.category}:${it.key}`); continue; }
      try { await applyGrant({ category: it.category, key: it.key, uid: user.userId, by: s.name, byId: s.id, action: "grant" }); done++; }
      catch (e) { errors.push(`${it.category}:${it.key}: ${e.message}`); }
    }
    await logAudit({
      actorId: s.id, actorName: s.name, action: "grant", category: "bundle", itemKey: bundle.name,
      target: `${user.username} (${user.userId})`, detail: `bundle "${bundle.name}" — ${done} granted`,
    });
    return NextResponse.json({ ok: !errors.length, done, skipped, errors, user });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
