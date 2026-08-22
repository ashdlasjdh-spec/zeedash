import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public community-wide leaderboard: the most active members across ALL the allow-listed servers
// over the last 30 days, aggregated per user. Edge-cached.
const PUBLIC_GUILD_IDS = ["1447037325380157452", "1496219608800170004", "1494327144829026354"];

export async function GET() {
  try {
    const rows = await query(
      `select user_id, max(username) username, sum(messages)::bigint m
       from member_stats
       where guild_id = any($1::text[]) and day >= current_date - interval '29 days' and username is not null
       group by user_id
       order by m desc
       limit 15`,
      [PUBLIC_GUILD_IDS],
    );
    const leaderboard = rows.map((r, i) => ({ rank: i + 1, name: r.username, messages: Number(r.m) || 0 }));
    return NextResponse.json({ leaderboard }, { headers: { "cache-control": "public, s-maxage=120, stale-while-revalidate=600" } });
  } catch (e) {
    return NextResponse.json({ leaderboard: [], error: e.message }, { headers: { "cache-control": "no-store" } });
  }
}
