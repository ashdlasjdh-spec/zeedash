import { query, ensureSchema } from "@/lib/db";
import { guardBot } from "@/lib/botauth";
import { levelFromXp, xpForNext } from "@/lib/levels";
import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Bot-facing: one member's rank card (for /rank). ?guild=&user= -> xp, level, progress into the
// current level, and their position on the leaderboard.
export async function GET(req) {
  const bad = guardBot(req); if (bad) return bad;
  const sp = req.nextUrl.searchParams;
  const guild = sp.get("guild") || "";
  const user = sp.get("user") || "";
  if (!guild || !/^\d{5,}$/.test(user)) return badRequest();
  try {
    await ensureSchema();
    const rows = await query("select xp from member_levels where guild_id=$1 and user_id=$2", [guild, user]);
    if (!rows.length) return NextResponse.json({ found: false });
    const xp = Number(rows[0].xp) || 0;
    const level = levelFromXp(xp);
    // XP consumed by all levels below the current one → progress within the current level.
    let base = 0;
    for (let l = 0; l < level; l++) base += xpForNext(l);
    const into = xp - base;
    const need = xpForNext(level);
    const pos = await query("select count(*)::int as c from member_levels where guild_id=$1 and xp > $2", [guild, xp]);
    const total = await query("select count(*)::int as c from member_levels where guild_id=$1", [guild]);
    return NextResponse.json({
      found: true, xp, level, into, need, rank: (pos[0]?.c || 0) + 1, total: total[0]?.c || 0,
    }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return serverError(e.message);
  }
}
