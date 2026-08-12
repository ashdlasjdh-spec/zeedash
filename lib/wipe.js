import { resolveUsername, dsGet, dsSet, publish } from "@/lib/roblox";
import { applyGrant, PERK_FIELD } from "@/lib/grantEngine";
import { listPerks } from "@/lib/perksApi";
import { query, logAudit } from "@/lib/db";

// Wipe EVERYTHING tied to one Roblox user — revokes every grant the SAME way a normal revoke does
// (applyGrant → correct topic + DashboardWhitelist / PlayerPerks datastores + shared DB), so powers
// actually leave the game, then blanks datastores and deletes the DB rows. Irreversible.
// Returns { ok, target, done, warn } or { error, status }.
export async function wipeUserData({ username, actorName, actorId }) {
  const user = await resolveUsername(username);
  if (!user) return { error: `No Roblox user "${username}"`, status: 404 };
  const uid = String(user.userId);
  const idNum = Number(uid);
  const done = [];
  const warn = [];
  let revoked = 0;

  let row = {};
  try { const { perks } = await listPerks(); row = (perks || []).find((p) => String(p.userId) === uid) || {}; }
  catch (e) { warn.push("perks read: " + e.message); }

  // Powers = union of the DB list AND every DashboardWhitelist power the user is actually in.
  const powerKeys = new Set(Array.isArray(row[PERK_FIELD.power]) ? row[PERK_FIELD.power] : []);
  try {
    const wl = (await dsGet("DashboardWhitelist", "powers")) || {};
    for (const [k, list] of Object.entries(wl)) {
      if (Array.isArray(list) && list.map(Number).includes(idNum)) powerKeys.add(k);
    }
  } catch (e) { warn.push("whitelist read: " + e.message); }

  for (const key of powerKeys) {
    try { await applyGrant({ category: "power", key, uid, by: actorName, byId: actorId, action: "revoke" }); revoked++; }
    catch (e) { warn.push(`power:${key}: ${e.message}`); }
  }
  for (const category of Object.keys(PERK_FIELD)) {
    if (category === "power") continue;
    const arr = row[PERK_FIELD[category]];
    for (const key of (Array.isArray(arr) ? arr : [])) {
      try { await applyGrant({ category, key, uid, by: actorName, byId: actorId, action: "revoke" }); revoked++; }
      catch (e) { warn.push(`${category}:${key}: ${e.message}`); }
    }
  }
  if (revoked) done.push(`revoked ${revoked} grant(s) in-game`);
  try { await publish("DashboardGrant", { action: "wipe", userId: uid, by: actorId }); } catch {}

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

  for (const [label, sql] of [
    ["perks row", "delete from perks where user_id::text = $1"],
    ["emojis", "delete from emojis where user_id::text = $1"],
    ["temp grants", "delete from grant_expiry where user_id::text = $1"],
  ]) {
    try { await query(sql, [uid]); done.push(label); } catch (e) { warn.push(`${label}: ${e.message}`); }
  }

  await logAudit({
    actorId, actorName, action: "wipe", category: "user",
    target: `${user.username} (${uid})`, detail: `wiped: ${done.join(", ") || "nothing"}${warn.length ? ` · issues: ${warn.length}` : ""}`,
  });
  return { ok: !warn.length, target: user, done, warn };
}
