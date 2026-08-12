import { getSession } from "@/lib/session";
import { canManageGuild } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Member leaderboard for the Server analytics page — top 50 members by messages, reactions and
// voice hours in the selected guild + window. Management+ only. Counts only, never content.
const top = (guild, days, col) =>
  query(
    `select user_id, max(username) username, sum(${col})::bigint v from member_stats
     where guild_id=$1 and day >= current_date - ($2 || ' days')::interval
     group by user_id having sum(${col}) > 0 order by v desc limit 50`,
    [guild, String(days - 1)],
  );

export async function GET(req) {
  const s = await getSession();
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!s || !canManageGuild(s, guild)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const days = Math.min(90, Math.max(7, parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30));
  if (!guild) return NextResponse.json({ messages: [], reactions: [], voice: [] });

  try {
    const [m, r, v] = await Promise.all([top(guild, days, "messages"), top(guild, days, "reactions"), top(guild, days, "voice_minutes")]);
    const map = (rows, div) => rows.map((x) => ({ id: x.user_id, name: x.username || x.user_id, value: div ? Math.round((Number(x.v) / div) * 10) / 10 : Number(x.v) }));
    return NextResponse.json({ messages: map(m), reactions: map(r), voice: map(v, 60) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
