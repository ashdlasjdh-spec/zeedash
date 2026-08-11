import { getSession } from "@/lib/session";
import { canPurge } from "@/lib/permissions";
import { resolveUsername, dsGet, dsSet, publish } from "@/lib/roblox";
import { query, logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POWER_REMOVE = process.env.POWER_REMOVE_TOPIC || "DiscordAdminPowerRemoveV1";

// Owner-only: wipe EVERYTHING tied to one Roblox user — the DashboardWhitelist + PlayerPerks
// datastores AND their perks / emojis / temp-grant rows in the DB. Irreversible.
export async function POST(req) {
  const s = await getSession();
  if (!s || !canPurge(s.id)) return NextResponse.json({ error: "Owner only." }, { status: 403 });
  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "Enter a username or ID." }, { status: 400 });

  const user = await resolveUsername(username);
  if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });
  const uid = String(user.userId);
  const done = [];
  const warn = [];

  // Their current powers — so online players lose them live before we delete the row.
  let powers = [];
  try { const r = await query("select powers from perks where user_id::text = $1", [uid]); powers = r[0]?.powers || []; } catch {}
  for (const p of powers) { try { await publish(POWER_REMOVE, { UserId: uid, Power: p, Admin: s.name }); } catch {} }
  try { await publish("DashboardGrant", { action: "wipe", userId: uid, by: s.id }); } catch {}

  // DashboardWhitelist "powers" — strip this id out of every power's list.
  try {
    const cur = (await dsGet("DashboardWhitelist", "powers")) || {};
    let changed = false; const id = Number(uid);
    for (const k of Object.keys(cur)) {
      if (Array.isArray(cur[k])) { const f = cur[k].map(Number).filter((v) => v !== id); if (f.length !== cur[k].length) { cur[k] = f; changed = true; } }
    }
    if (changed) await dsSet("DashboardWhitelist", "powers", cur);
    done.push("whitelist datastore");
  } catch (e) { warn.push("whitelist: " + e.message); }

  // PlayerPerks entry — clear it (no delete op in Open Cloud v1, so blank it).
  try { await dsSet("PlayerPerks", uid, {}); done.push("PlayerPerks datastore"); } catch (e) { warn.push("PlayerPerks: " + e.message); }

  // DB rows.
  for (const [label, sql] of [
    ["perks", "delete from perks where user_id::text = $1"],
    ["emojis", "delete from emojis where user_id::text = $1"],
    ["temp grants", "delete from grant_expiry where user_id::text = $1"],
  ]) {
    try { await query(sql, [uid]); done.push(label); } catch (e) { warn.push(`${label}: ${e.message}`); }
  }

  await logAudit({
    actorId: s.id, actorName: s.name, action: "wipe", category: "user",
    target: `${user.username} (${uid})`, detail: `wiped: ${done.join(", ") || "nothing"}${warn.length ? ` · issues: ${warn.length}` : ""}`,
  });
  return NextResponse.json({ ok: true, target: user, done, warn });
}
