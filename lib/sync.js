import { listPerks, listTags, listEmojis } from "@/lib/perksApi";
import { dsGet, dsSet, publish } from "@/lib/roblox";
import { pushTagsBulk } from "@/lib/crewtags";
import { logAudit } from "@/lib/db";

async function runInBatches(items, size, worker) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(worker));
    if (i + size < items.length) await new Promise((r) => setTimeout(r, 150));
  }
}
const BATCH = 8;

function grantKeysFor(p) {
  const keys = {};
  for (const pw of p.powers || []) keys[pw] = true;
  for (const st of p.stand || []) keys[st] = true;
  for (const sh of p.shazam || []) keys["Shazam:" + sh] = true;
  for (const _br of p.startbr || []) keys["StartBR"] = true;
  for (const _c of p.car || []) keys["SVJCar"] = true;
  return keys;
}

// Re-hydrate the CURRENT universe from the shared Postgres DB (perks + grants + tags + emojis).
// Returns the `out` summary object. Never throws for a soft failure — collects into out.errors.
export async function syncDbToGame({ actorName, actorId }) {
  const out = { perksSynced: 0, perksSkipped: 0, grantsSynced: 0, tagsSynced: 0, emojisSynced: 0, whitelistPowers: 0, pinged: 0, errors: [] };

  let perks = [];
  try { perks = (await listPerks()).perks || []; }
  catch (e) { return { error: `Could not read the perks DB: ${e.message}`, status: 500 }; }

  await runInBatches(perks, BATCH, async (p) => {
    const entry = {
      gamepasses: p.gamepasses || [], powers: p.powers || [], tools: p.tools || [],
      shazam: p.shazam || [], stand: p.stand || [], car: p.car || [], startbr: p.startbr || [],
      armor: p.armor || 0, grantedBy: p.grantedBy || "db-sync", updatedAt: Math.floor(Date.now() / 1000),
    };
    const empty = !entry.armor && !entry.gamepasses.length && !entry.powers.length && !entry.tools.length &&
      !entry.shazam.length && !entry.stand.length && !entry.car.length && !entry.startbr.length;
    if (empty) { out.perksSkipped++; return; }
    try { await dsSet("PlayerPerks", String(p.userId), entry); out.perksSynced++; }
    catch (e) { out.errors.push(`perks ${p.userId}: ${e.message}`); }
  });

  await runInBatches(perks, BATCH, async (p) => {
    const keys = grantKeysFor(p);
    if (Object.keys(keys).length === 0) return;
    try { await dsSet("DashboardGrants", "u_" + p.userId, keys); out.grantsSynced++; }
    catch (e) { out.errors.push(`grants ${p.userId}: ${e.message}`); }
  });

  for (const p of perks.slice(0, 15)) { try { await publish("PerkGrant", { userId: Number(p.userId) }); out.pinged++; } catch {} }

  try {
    const wl = {};
    for (const p of perks) for (const pw of p.powers || []) (wl[pw] = wl[pw] || []).push(Number(p.userId));
    let prevWl = {};
    try { prevWl = (await dsGet("DashboardWhitelist", "powers")) || {}; } catch { prevWl = {}; }
    const prevN = Object.keys(prevWl).length, nextN = Object.keys(wl).length;
    if (prevN >= 3 && nextN < Math.max(1, Math.floor(prevN * 0.5))) {
      out.errors.push(`whitelist: refused to shrink from ${prevN} to ${nextN} (DB read looks partial). Left unchanged.`);
    } else { await dsSet("DashboardWhitelist", "powers", wl); out.whitelistPowers = nextN; }
  } catch (e) { out.errors.push(`whitelist: ${e.message}`); }

  try {
    const { tags } = await listTags();
    const { pushed, errors } = await pushTagsBulk(tags || {}, `db-sync (${actorName})`);
    out.tagsSynced = pushed;
    for (const e of errors) out.errors.push(`tag ${e}`);
  } catch (e) { out.errors.push(`tags: ${e.message}`); }

  try {
    const { emojis } = await listEmojis();
    const dbMap = emojis || {};
    const dbCount = Object.keys(dbMap).length;
    let live = {};
    try { live = (await dsGet("CustomEmojis", "emojis")) || {}; } catch { live = {}; }
    if (dbCount === 0 && Object.keys(live).length >= 5) {
      out.errors.push(`emojis: DB has 0 but live store has ${Object.keys(live).length}; left unchanged.`);
    } else {
      const merged = { ...live, ...dbMap };
      await dsSet("CustomEmojis", "emojis", merged);
      await publish("CustomEmojiUpdate", {}).catch(() => {});
      out.emojisSynced = Object.keys(merged).length;
    }
  } catch (e) { out.errors.push(`emojis: ${e.message}`); }

  try {
    await logAudit({ actorId, actorName, action: "sync", detail: `DB -> game: ${out.perksSynced} perks, ${out.grantsSynced} grants, ${out.tagsSynced} tags, ${out.emojisSynced} emojis, ${out.errors.length} errors` });
  } catch (e) { out.errors.push(`audit-log: ${e.message}`); }
  return { ok: out.errors.length === 0, ...out };
}
