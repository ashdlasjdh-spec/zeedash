import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { listPerks, listTags } from "@/lib/perksApi";
import { dsSet, publish } from "@/lib/roblox";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/sync — re-push EVERYTHING in the shared DB into the universe currently set in
// Settings. Use after copying the game / swapping the universe id: it rewrites each player's
// PlayerPerks entry and the full CrewTagDefs, then pings the most-recent players so online
// users update immediately (everyone else applies on their next spawn). Co-owner+ (251+) only.
export async function POST() {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return NextResponse.json({ error: "Co-owner+ only." }, { status: 403 });

  const result = { players: 0, tagGroups: 0, pinged: 0, errors: [] };
  try {
    // ---- perks -> PlayerPerks DataStore (PerkReceiver re-applies on spawn) ----
    const { perks } = await listPerks();
    const rows = (perks || []).filter((p) => p && p.userId);
    for (const p of rows) {
      const entry = {
        gamepasses: p.gamepasses || [], powers: p.powers || [], tools: p.tools || [],
        shazam: p.shazam || [], armor: p.armor || 0,
        grantedBy: p.grantedBy || "sync", updatedAt: Math.floor(Date.now() / 1000),
      };
      try { await dsSet("PlayerPerks", String(p.userId), entry); result.players++; }
      catch (e) { result.errors.push(`perks ${p.userId}: ${e.message}`); }
    }

    // ---- crew tags -> CrewTagDefs (the DB /tags shape IS the defs shape) ----
    try {
      const { tags } = await listTags();
      await dsSet("CrewTagDefs", "defs", tags || {});
      await publish("CrewTagUpdate", {});
      result.tagGroups = Object.keys(tags || {}).length;
    } catch (e) { result.errors.push(`tags: ${e.message}`); }

    // ---- ping the 15 most-recently-updated players so online users update now ----
    const recent = [...rows].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 15);
    for (const p of recent) {
      try { await publish("PerkGrant", { userId: Number(p.userId) }); result.pinged++; } catch {}
    }

    await logAudit({ actorId: s.id, actorName: s.name, action: "sync", detail: `${result.players} players, ${result.tagGroups} tag groups` });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
