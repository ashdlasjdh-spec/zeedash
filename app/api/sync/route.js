import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { listPerks, listTags, listEmojis } from "@/lib/perksApi";
import { dsGet, dsSet, publish } from "@/lib/roblox";
import { pushTagsBulk } from "@/lib/crewtags";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/sync — re-hydrate the CURRENT universe from the shared Postgres DB.
// Writes EVERYTHING the game reads back after a universe swap:
//   perks   -> PlayerPerks     (gamepasses / tools / armor; GearServer reads on spawn)
//   grants  -> DashboardGrants  (powers / stands / shazam / car / startbr; _G.DashboardGrants:HasGrant)
//   tags    -> CrewTagDefs
//   emojis  -> CustomEmojis
function grantKeysFor(p) {
  const keys = {};
  for (const pw of p.powers || []) keys[pw] = true;
  for (const st of p.stand || []) keys[st] = true;
  for (const sh of p.shazam || []) keys["Shazam:" + sh] = true;
  for (const _br of p.startbr || []) keys["StartBR"] = true;
  for (const _c of p.car || []) keys["SVJCar"] = true;
  return keys;
}

export async function POST() {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Outer guard: ANY throw returns JSON so the client never gets a non-JSON
  // error page ("Unexpected token 'A'... not valid JSON").
  try {
  const out = {
    perksSynced: 0, perksSkipped: 0, grantsSynced: 0, tagsSynced: 0,
    emojisSynced: 0, whitelistPowers: 0, pinged: 0, errors: [],
  };

  let perks = [];
  try {
    perks = (await listPerks()).perks || [];
  } catch (e) {
    return NextResponse.json({ error: `Could not read the perks DB: ${e.message}` }, { status: 500 });
  }

  // ---- perks -> PlayerPerks ----
  for (const p of perks) {
    const entry = {
      gamepasses: p.gamepasses || [], powers: p.powers || [], tools: p.tools || [],
      shazam: p.shazam || [], stand: p.stand || [], car: p.car || [], startbr: p.startbr || [],
      armor: p.armor || 0, grantedBy: p.grantedBy || "db-sync", updatedAt: Math.floor(Date.now() / 1000),
    };
    const empty = !entry.armor && !entry.gamepasses.length && !entry.powers.length &&
      !entry.tools.length && !entry.shazam.length && !entry.stand.length &&
      !entry.car.length && !entry.startbr.length;
    if (empty) { out.perksSkipped++; continue; }
    try { await dsSet("PlayerPerks", String(p.userId), entry); out.perksSynced++; }
    catch (e) { out.errors.push(`perks ${p.userId}: ${e.message}`); }
  }

  // ---- grants -> DashboardGrants (this is what actually gates powers/stands/shazam/car/startbr) ----
  for (const p of perks) {
    const keys = grantKeysFor(p);
    if (Object.keys(keys).length === 0) continue;
    try {
      const existing = (await dsGet("DashboardGrants", "u_" + p.userId)) || {};
      const merged = (typeof existing === "object" && !Array.isArray(existing)) ? existing : {};
      for (const k of Object.keys(keys)) merged[k] = true;
      await dsSet("DashboardGrants", "u_" + p.userId, merged);
      out.grantsSynced++;
    } catch (e) { out.errors.push(`grants ${p.userId}: ${e.message}`); }
  }

  for (const p of perks.slice(0, 15)) {
    try { await publish("PerkGrant", { userId: Number(p.userId) }); out.pinged++; } catch {}
  }

  // ---- powers -> DashboardWhitelist (legacy; harmless to keep) ----
  try {
    const wl = {};
    for (const p of perks) for (const pw of p.powers || []) (wl[pw] = wl[pw] || []).push(Number(p.userId));
    let prevWl = {};
    try { prevWl = (await dsGet("DashboardWhitelist", "powers")) || {}; } catch { prevWl = {}; }
    const prevN = Object.keys(prevWl).length, nextN = Object.keys(wl).length;
    if (prevN >= 3 && nextN < Math.max(1, Math.floor(prevN * 0.5))) {
      out.errors.push(`whitelist: refused to shrink from ${prevN} to ${nextN} (DB read looks partial). Left unchanged.`);
    } else {
      await dsSet("DashboardWhitelist", "powers", wl);
      out.whitelistPowers = nextN;
    }
  } catch (e) { out.errors.push(`whitelist: ${e.message}`); }

  // ---- crew tags -> CrewTagDefs ----
  try {
    const { tags } = await listTags();
    const { pushed, errors } = await pushTagsBulk(tags || {}, `db-sync (${s.name})`);
    out.tagsSynced = pushed;
    for (const e of errors) out.errors.push(`tag ${e}`);
  } catch (e) { out.errors.push(`tags: ${e.message}`); }

  // ---- emojis -> CustomEmojis ----
  try {
    const { emojis } = await listEmojis();
    const dbMap = emojis || {};
    const dbCount = Object.keys(dbMap).length;
    let live = {};
    try { live = (await dsGet("CustomEmojis", "emojis")) || {}; } catch { live = {}; }
    const liveCount = Object.keys(live).length;
    if (dbCount === 0 && liveCount >= 5) {
      out.errors.push(`emojis: DB has 0 but live store has ${liveCount}; left unchanged.`);
    } else {
      const merged = { ...live, ...dbMap };
      await dsSet("CustomEmojis", "emojis", merged);
      await publish("CustomEmojiUpdate", {}).catch(() => {});
      out.emojisSynced = Object.keys(merged).length;
    }
  } catch (e) { out.errors.push(`emojis: ${e.message}`); }

  try {
    await logAudit({
      actorId: s.id, actorName: s.name, action: "sync",
      detail: `DB -> game: ${out.perksSynced} perks, ${out.grantsSynced} grants, ${out.tagsSynced} tags, ${out.emojisSynced} emojis, ${out.errors.length} errors`,
    });
  } catch (e) { out.errors.push(`audit-log: ${e.message}`); }
  return NextResponse.json({ ok: out.errors.length === 0, ...out });
  } catch (e) {
    return NextResponse.json({ error: `Sync failed: ${e?.message || String(e)}` }, { status: 500 });
  }
}
