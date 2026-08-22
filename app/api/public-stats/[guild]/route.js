import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public, detailed stats for ONE allow-listed community server: 30-day activity totals, a 14-day
// message series (for the mini chart), and a top-members leaderboard. Same allow-list + edge cache as
// the summary endpoint. Anything not on the list 404s.
const PUBLIC_GUILD_IDS = ["1447037325380157452", "1496219608800170004", "1494327144829026354"];
const GUILD_INVITES = { "1447037325380157452": "zhd", "1496219608800170004": "zhdboard", "1494327144829026354": "zhdhof" };
const GUILD_LABELS = { "1447037325380157452": "ZHD", "1496219608800170004": "ZHD Board", "1494327144829026354": "ZHD HOF" };

export async function GET(_req, { params }) {
  const guild = String(params?.guild || "");
  if (!PUBLIC_GUILD_IDS.includes(guild)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const [meta, totals, members, series, board] = await Promise.all([
      query("select max(guild_name) name, max(guild_icon) icon from server_stats where guild_id=$1", [guild]),
      query(
        `select coalesce(sum(messages),0)::bigint messages, coalesce(sum(reactions),0)::bigint reactions,
                coalesce(sum(voice_minutes),0)::bigint voice from server_stats
         where guild_id=$1 and day >= current_date - interval '29 days'`, [guild]),
      query("select members from server_stats where guild_id=$1 and members is not null order by day desc limit 1", [guild]),
      query(
        `select to_char(day,'MM-DD') d, messages::int m from server_stats
         where guild_id=$1 and day >= current_date - interval '13 days' order by day`, [guild]),
      query(
        `select username, sum(messages)::bigint m from member_stats
         where guild_id=$1 and day >= current_date - interval '29 days' and username is not null
         group by username order by m desc limit 10`, [guild]),
    ]);

    const name = meta[0]?.name || GUILD_LABELS[guild] || guild;
    const icon = meta[0]?.icon ? `https://cdn.discordapp.com/icons/${guild}/${meta[0].icon}.png?size=96` : null;
    return NextResponse.json({
      id: guild, name, icon, invite: `https://discord.gg/${GUILD_INVITES[guild] || "zhd"}`,
      totals: {
        members: members[0]?.members ?? null,
        messages: Number(totals[0]?.messages || 0),
        reactions: Number(totals[0]?.reactions || 0),
        voiceMinutes: Number(totals[0]?.voice || 0),
      },
      series: series.map((r) => ({ d: r.d, m: Number(r.m) || 0 })),
      leaderboard: board.map((r, i) => ({ rank: i + 1, name: r.username, messages: Number(r.m) || 0 })),
    }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
