import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public, FULL analytics for ONE allow-listed community server — the same shape the staff Server
// Analytics page uses: 30-day totals + previous-period totals (for % deltas), a 30-day daily series
// (messages / reactions / voice), top channels, and a top-members leaderboard. Allow-list + edge cache.
const PUBLIC_GUILD_IDS = ["1447037325380157452", "1496219608800170004", "1494327144829026354"];
const GUILD_INVITES = { "1447037325380157452": "zhd", "1496219608800170004": "zhdboard", "1494327144829026354": "zhdhof" };
const GUILD_LABELS = { "1447037325380157452": "ZHD", "1496219608800170004": "ZHD Board", "1494327144829026354": "ZHD HOF" };
const N = (x) => Number(x || 0);

export async function GET(_req, { params }) {
  const guild = String(params?.guild || "");
  if (!PUBLIC_GUILD_IDS.includes(guild)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const [meta, totals, prev, members, series, channels, board] = await Promise.all([
      query("select max(guild_name) name, max(guild_icon) icon from server_stats where guild_id=$1", [guild]),
      query(
        `select coalesce(sum(messages),0)::bigint messages, coalesce(sum(reactions),0)::bigint reactions,
                coalesce(sum(voice_minutes),0)::bigint voice from server_stats
         where guild_id=$1 and day >= current_date - interval '29 days'`, [guild]),
      query(
        `select coalesce(sum(messages),0)::bigint messages, coalesce(sum(reactions),0)::bigint reactions,
                coalesce(sum(voice_minutes),0)::bigint voice from server_stats
         where guild_id=$1 and day >= current_date - interval '59 days' and day < current_date - interval '29 days'`, [guild]),
      query("select members from server_stats where guild_id=$1 and members is not null order by day desc limit 1", [guild]),
      query(
        `select to_char(day,'YYYY-MM-DD') d, messages::int msg, reactions::int rx, voice_minutes::int vm
         from server_stats where guild_id=$1 and day >= current_date - interval '29 days' order by day`, [guild]),
      query(
        `select max(channel_name) name, sum(messages)::bigint m from channel_stats
         where guild_id=$1 and day >= current_date - interval '29 days'
         group by channel_id order by m desc limit 8`, [guild]),
      query(
        `select username, sum(messages)::bigint m from member_stats
         where guild_id=$1 and day >= current_date - interval '29 days' and username is not null
         group by username order by m desc limit 10`, [guild]),
    ]);

    const name = meta[0]?.name || GUILD_LABELS[guild] || guild;
    const icon = meta[0]?.icon ? `https://cdn.discordapp.com/icons/${guild}/${meta[0].icon}.png?size=96` : null;
    return NextResponse.json({
      id: guild, name, icon, invite: `https://discord.gg/${GUILD_INVITES[guild] || "zhd"}`, days: 30,
      totals: { members: members[0]?.members ?? null, messages: N(totals[0]?.messages), reactions: N(totals[0]?.reactions), voiceMinutes: N(totals[0]?.voice) },
      prev: { messages: N(prev[0]?.messages), reactions: N(prev[0]?.reactions), voiceMinutes: N(prev[0]?.voice) },
      series: series.map((r) => ({ d: r.d, messages: N(r.msg), reactions: N(r.rx), voiceMinutes: N(r.vm) })),
      channels: channels.map((c) => ({ name: c.name || "unknown", messages: N(c.m) })),
      leaderboard: board.map((r, i) => ({ rank: i + 1, name: r.username, messages: N(r.m) })),
    }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
