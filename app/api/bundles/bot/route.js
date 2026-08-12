import { canConfig, can } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { applyGrant } from "@/lib/grantEngine";
import { query, logAudit } from "@/lib/db";
import { botAuthed as authed } from "@/lib/botauth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function readBundles() {
  try { const rows = await query("select value from config where key = 'grant_bundles'"); return JSON.parse(rows[0]?.value || "[]"); }
  catch { return []; }
}

// GET — list bundle names (for the bot's /give bundle autocomplete).
export async function GET(req) {
  if (!authed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ bundles: await readBundles() });
}

// POST { action:"apply", name, username, actor* } — apply a bundle to a player (co owners+).
export async function POST(req) {
  if (!authed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { action, name, username, actorName, actorId, actorLevel } = await req.json().catch(() => ({}));
  const level = Number(actorLevel) || 0;
  if (action !== "apply") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (!canConfig(level)) return NextResponse.json({ error: "Bundles are co owners+ only." }, { status: 403 });
  const bundle = (await readBundles()).find((b) => b.name.toLowerCase() === String(name || "").trim().toLowerCase());
  if (!bundle) return NextResponse.json({ error: "No such bundle." }, { status: 404 });
  const user = await resolveUsername(String(username || "").trim()).catch(() => null);
  if (!user) return NextResponse.json({ error: "No such Roblox user." }, { status: 404 });

  let done = 0; const skipped = [], errors = [];
  for (const it of bundle.items) {
    if (!can(level, it.category)) { skipped.push(`${it.category}:${it.key}`); continue; }
    try { await applyGrant({ category: it.category, key: it.key, uid: user.userId, by: actorName || "Discord", byId: actorId || "bot", action: "grant" }); done++; }
    catch (e) { errors.push(`${it.category}:${it.key}: ${e.message}`); }
  }
  await logAudit({ actorId, actorName, action: "grant", category: "bundle", itemKey: bundle.name, target: `${user.username} (${user.userId})`, detail: `bundle "${bundle.name}" — ${done} granted` });
  return NextResponse.json({ ok: !errors.length, done, skipped, errors, user, bundle: bundle.name });
}
