import { getSession } from "@/lib/session";
import { canManageGuild } from "@/lib/permissions";
import { query, ensureSchema } from "@/lib/db";
import { botAuthed } from "@/lib/botauth";
import { levelFromXp } from "@/lib/levels";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// XP leaderboard for a guild. Dual-auth: the bot (CRON_SECRET, for /levels) OR a signed-in dashboard
// user who manages that guild (Roblox staff or its Discord admin). ?guild=&limit=
export async function GET(req) {
  const guild = req.nextUrl.searchParams.get("guild") || "";
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 25));
  if (!botAuthed(req)) {
    const s = await getSession();
    if (!s || !canManageGuild(s, guild)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!guild) return NextResponse.json({ rows: [] });
  try {
    await ensureSchema();
    const rows = await query(
      "select user_id, username, xp from member_levels where guild_id=$1 order by xp desc limit $2",
      [guild, limit],
    );
    const out = rows.map((r) => ({ id: r.user_id, name: r.username || null, xp: Number(r.xp) || 0, level: levelFromXp(Number(r.xp) || 0) }));
    return NextResponse.json({ rows: out }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
