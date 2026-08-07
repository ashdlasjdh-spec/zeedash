import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { listPerks, listTags } from "@/lib/perksApi";
import { dsGet, dsSet, publish } from "@/lib/roblox";
import { pushTagsBulk } from "@/lib/crewtags";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Syncing hundreds of rows can outlive the default serverless timeout.
export const maxDuration = 300;

// POST /api/sync — re-hydrate the CURRENT universe (whatever is in Settings) from
// the shared Postgres DB. Use after swapping the game / universe ID: the new
// universe's DataStores start empty, but the DB is universe-independent, so this
// writes everything back:
//   * perks  -> "PlayerPerks" DataStore, one entry per user
//               (gamepasses / powers / tools / shazam / armor — the exact keys
//               PerkReceiver.lua + GearServer read on spawn)
//   * tags   -> "CrewTagDefs" DataStore via the same pushTag path the tag maker
//               uses (also pings CrewTagUpdate so live servers refresh)
// Players receive their perks on next spawn/join; a handful of PerkGrant pings go
// out for the most recently-updated users so anyone currently online updates now
// (capped to stay well inside MessagingService rate limits).
export async function POST() {
  // Outer guard: ANY throw (auth, config, upstream) returns JSON so the client
  // never gets a non-JSON error page ("Unexpected token 'A'... not valid JSON").
  try {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const out = { perksSynced: 0, perksSkipped: 0, tagsSynced: 0, whitelistPowers: 0, pinged: 0, errors: [] };

  // ---- perks -> PlayerPerks ----
  let perks = [];
  try {
    perks = (await listPerks()).perks || [];
  } catch (e) {
    return NextResponse.json({ error: `Could not read the perks DB: ${e.message}` }, { status: 500 });
  }
  for (const p of perks) {
    const entry = {
      gamepasses: p.gamepasses || [],
      powers: p.powers || [],
      tools: p.tools || [],
      shazam: p.shazam || [],
      stand: p.stand || [],
      car: p.car || [],
      startbr: p.startbr || [],
      armor: p.armor || 0,
      grantedBy: p.grantedBy || "db-sync",
      updatedAt: Math.floor(Date.now() / 1000),
    };
    const empty =
      !entry.armor && !entry.gamepasses.length && !entry.powers.length &&
      !entry.tools.length && !entry.shazam.length && !entry.stand.length &&
      !entry.car.length && !entry.startbr.length;
    if (empty) { out.perksSkipped++; continue; }
    try {
      await dsSet("PlayerPerks", String(p.userId), entry);
      out.perksSynced++;
    } catch (e) {
      out.errors.push(`perks ${p.userId}: ${e.message}`);
    }
  }

  // Ping the 15 most recently-updated users (list is newest-first) so anyone
  // online right now re-applies without a respawn. Everyone else gets theirs on
  // next spawn — PerkReceiver re-fetches PlayerPerks on every CharacterAdded.
  for (const p of perks.slice(0, 15)) {
    try { await publish("PerkGrant", { userId: Number(p.userId) }); out.pinged++; } catch {}
  }

  // ---- powers -> DashboardWhitelist store ----
  // Rebuild { [PowerName]: [userIds] } from the DB so whitelist-gated powers
  // (Flash / Fly / Magic / flames) and the per-power tool gates come back after
  // a universe swap — DashboardWhitelistSync merges this on every server boot.
  try {
    const wl = {};
    for (const p of perks) {
      for (const pw of p.powers || []) {
        (wl[pw] = wl[pw] || []).push(Number(p.userId));
      }
    }
    // Anti-clobber: if the DB read (perks) came back empty/partial, wl would be tiny and this
    // overwrite would wipe the live whitelist. Compare against what's already stored and refuse
    // a drastic shrink. A genuinely-empty existing store (fresh universe) is allowed to populate.
    let prevWl = {};
    try { prevWl = (await dsGet("DashboardWhitelist", "powers")) || {}; } catch { prevWl = {}; }
    const prevN = Object.keys(prevWl).length;
    const nextN = Object.keys(wl).length;
    if (prevN >= 3 && nextN < Math.max(1, Math.floor(prevN * 0.5))) {
      out.errors.push(`whitelist: refused to shrink powers whitelist from ${prevN} to ${nextN} (DB read looks partial). Left unchanged.`);
    } else {
      await dsSet("DashboardWhitelist", "powers", wl);
      out.whitelistPowers = nextN;
    }
  } catch (e) {
    out.errors.push(`whitelist: ${e.message}`);
  }

  // ---- crew tags -> CrewTagDefs (best-effort) ----
  // One DataStore write + ONE CrewTagUpdate publish for the whole set, so the
  // in-game loader refreshes once instead of once per tag (which used to make
  // the tag renderer rebuild repeatedly and restart every gradient animation).
  try {
    const { tags } = await listTags();
    const { pushed, errors } = await pushTagsBulk(tags || {}, `db-sync (${s.name})`);
    out.tagsSynced = pushed;
    for (const e of errors) out.errors.push(`tag ${e}`);
  } catch (e) {
    out.errors.push(`tags: ${e.message}`);
  }

  try {
    await logAudit({
      actorId: s.id, actorName: s.name, action: "sync",
      detail: `DB -> game: ${out.perksSynced} perk entries, ${out.tagsSynced} tags, ${out.errors.length} errors`,
    });
  } catch (e) {
    out.errors.push(`audit-log: ${e.message}`);
  }
  return NextResponse.json({ ok: out.errors.length === 0, ...out });
  } catch (e) {
    return NextResponse.json({ error: `Sync failed: ${e?.message || String(e)}` }, { status: 500 });
  }
}
