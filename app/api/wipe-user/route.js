import { getSession } from "@/lib/session";
import { canPurge } from "@/lib/permissions";
import { resolveUsername, dsGet, dsSet, publish } from "@/lib/roblox";
import { applyGrant, PERK_FIELD } from "@/lib/grantEngine";
import { listPerks } from "@/lib/perksApi";
import { query, logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Owner-only: wipe EVERYTHING tied to one Roblox user. This revokes every grant the SAME way a
// normal revoke does (applyGrant → correct MessagingService topic + DashboardWhitelist / PlayerPerks
// datastores + shared DB), so powers actually leave the game — not just the DB rows. Irreversible.
export async function POST(req) {
  const s = await getSession();
  if (!s || !canPurge(s.id)) return NextResponse.json({ error: "Owner only." }, { status: 403 });
  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "Enter a username or ID." }, { status: 400 });

  const user = await resolveUsername(username);
  if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });
  const uid = String(user.userId);
  const idNum = Number(uid);
  const done = [];
  const warn = [];
  let revoked = 0;

  // The user's grants from the shared perks DB (all categories).
  let row = {};
  try { const { perks } = await listPerks(); row = (perks || []).find((p) => String(p.userId) === uid) || {}; }
  catch (e) { warn.push("perks read: " + e.message); }

  // Powers = the union of the DB list AND every DashboardWhitelist power the user is actually in —
  // the whitelist is the authoritative in-game gate, so this catches powers the DB may have drifted from.
  const powerKeys = new Set(Array.isArray(row[PERK_FIELD.power]) ? row[PERK_FIELD.power] : []);
  try {
    const wl = (await dsGet("DashboardWhitelist", "powers")) || {};
    for (const [k, list] of Object.entries(wl)) {
      if (Array.isArray(list) && list.map(Number).includes(idNum)) powerKeys.add(k);
    }
  } catch (e) { warn.push("whitelist read: " + e.message); }

  // Revoke every power the proper way (remove topic + whitelist patch + DB sync).
  for (const key of powerKeys) {
    try { await applyGrant({ category: "power", key, uid, by: s.name, byId: s.id, action: "revoke" }); revoked++; }
    catch (e) { warn.push(`power:${key}: ${e.message}`); }
  }

  // Revoke every OTHER category the user holds (gamepass / shazam / tool / startbr / stand / car).
  for (const category of Object.keys(PERK_FIELD)) {
    if (category === "power") continue;
    const arr = row[PERK_FIELD[category]];
    for (const key of (Array.isArray(arr) ? arr : [])) {
      try { await applyGrant({ category, key, uid, by: s.name, byId: s.id, action: "revoke" }); revoked++; }
      catch (e) { warn.push(`${category}:${key}: ${e.message}`); }
    }
  }
  if (revoked) done.push(`revoked ${revoked} grant(s) in-game`);
  try { await publish("DashboardGrant", { action: "wipe", userId: uid, by: s.id }); } catch {}

  // Belt-and-suspenders: blank the PlayerPerks entry (shazam variants, emojis, etc.) and strip the
  // user from any remaining DashboardWhitelist power lists, so nothing lingers.
  try { await dsSet("PlayerPerks", uid, {}); done.push("PlayerPerks datastore"); } catch (e) { warn.push("PlayerPerks: " + e.message); }
  try {
    const cur = (await dsGet("DashboardWhitelist", "powers")) || {};
    let changed = false;
    for (const k of Object.keys(cur)) {
      if (Array.isArray(cur[k])) { const f = cur[k].map(Number).filter((v) => v !== idNum); if (f.length !== cur[k].length) { cur[k] = f; changed = true; } }
    }
    if (changed) await dsSet("DashboardWhitelist", "powers", cur);
    done.push("whitelist datastore");
  } catch (e) { warn.push("whitelist strip: " + e.message); }

  // Delete the remaining shared-DB rows (the per-item revokes above already emptied perks arrays).
  for (const [label, sql] of [
    ["perks row", "delete from perks where user_id::text = $1"],
    ["emojis", "delete from emojis where user_id::text = $1"],
    ["temp grants", "delete from grant_expiry where user_id::text = $1"],
  ]) {
    try { await query(sql, [uid]); done.push(label); } catch (e) { warn.push(`${label}: ${e.message}`); }
  }

  await logAudit({
    actorId: s.id, actorName: s.name, action: "wipe", category: "user",
    target: `${user.username} (${uid})`, detail: `wiped: ${done.join(", ") || "nothing"}${warn.length ? ` · issues: ${warn.length}` : ""}`,
  });
  return NextResponse.json({ ok: !warn.length, target: user, done, warn });
}
