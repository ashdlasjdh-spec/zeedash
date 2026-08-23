import { canConfig, can } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { applyGrant } from "@/lib/grantEngine";
import { query, logAudit } from "@/lib/db";
import { botAuthed as authed } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function readBundles() {
  try { const rows = await query("select value from config where key = 'grant_bundles'"); return JSON.parse(rows[0]?.value || "[]"); }
  catch { return []; }
}

// GET — list bundle names (for the bot's /give bundle autocomplete).
export async function GET(req) {
  if (!authed(req)) return forbidden();
  return NextResponse.json({ bundles: await readBundles() });
}

// POST { action:"apply", name, username, actor* } — apply a bundle to a player (co owners+).
export async function POST(req) {
  if (!authed(req)) return forbidden();
  const { action, name, username, actorName, actorId, actorLevel } = await req.json().catch(() => ({}));
  const level = Number(actorLevel) || 0;
  if (action !== "apply") return badRequest("Unknown action.");
  if (!canConfig(level)) return forbidden("Bundles are co owners+ only.");
  const bundle = (await readBundles()).find((b) => b.name.toLowerCase() === String(name || "").trim().toLowerCase());
  if (!bundle) return notFound("No such bundle.");
  const user = await resolveUsername(String(username || "").trim()).catch(() => null);
  if (!user) return notFound("No such Roblox user.");

  let done = 0; const skipped = [], errors = [];
  for (const it of bundle.items) {
    if (!can(level, it.category)) { skipped.push(`${it.category}:${it.key}`); continue; }
    try { await applyGrant({ category: it.category, key: it.key, uid: user.userId, by: actorName || "Discord", byId: actorId || "bot", action: "grant" }); done++; }
    catch (e) { errors.push(`${it.category}:${it.key}: ${e.message}`); }
  }
  await logAudit({ actorId, actorName, action: "grant", category: "bundle", itemKey: bundle.name, target: `${user.username} (${user.userId})`, detail: `bundle "${bundle.name}" — ${done} granted` });
  return NextResponse.json({ ok: !errors.length, done, skipped, errors, user, bundle: bundle.name });
}
