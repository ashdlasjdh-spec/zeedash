import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Server analytics for the dashboard "Server" page. Management+ only.
export async function GET(req) {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const days = Math.min(90, Math.max(7, parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30));
  let guild = req.nextUrl.searchParams.get("guild") || "";

  try {
    // Every guild we have data for (most recently active first) — drives the server switcher.
    const guilds = await query(
      "select guild_id, max(guild_name) guild_name, sum(messages)::bigint messages, max(updated_at) last from server_stats group by guild_id order by max(updated_at) desc",
    );
    if (!guild && guilds[0]) guild = guilds[0].guild_id;
    if (!guild) return NextResponse.json({ guilds: [], guild: null, days });

    const [series, totals, channels, latestMembers] = await Promise.all([
      query(
        `select to_char(day,'YYYY-MM-DD') d, messages, reactions, voice_minutes from server_stats
         where guild_id=$1 and day >= current_date - ($2 || ' days')::interval order by day`,
        [guild, String(days - 1)],
      ),
      query(
        `select coalesce(sum(messages),0)::bigint messages, coalesce(sum(reactions),0)::bigint reactions,
                coalesce(sum(voice_minutes),0)::bigint voice_minutes from server_stats
         where guild_id=$1 and day >= current_date - ($2 || ' days')::interval`,
        [guild, String(days - 1)],
      ),
      query(
        `select channel_id, max(channel_name) channel_name, sum(messages)::bigint messages from channel_stats
         where guild_id=$1 and day >= current_date - ($2 || ' days')::interval
         group by channel_id order by messages desc limit 10`,
        [guild, String(days - 1)],
      ),
      query("select members from server_stats where guild_id=$1 and members is not null order by day desc limit 1", [guild]),
    ]);

    return NextResponse.json({
      guilds: guilds.map((g) => ({ guildId: g.guild_id, guildName: g.guild_name || g.guild_id, messages: Number(g.messages) })),
      guild, days,
      totals: {
        messages: Number(totals[0]?.messages || 0),
        reactions: Number(totals[0]?.reactions || 0),
        voiceMinutes: Number(totals[0]?.voice_minutes || 0),
        members: latestMembers[0]?.members ?? null,
      },
      series: series.map((r) => ({ d: r.d, messages: Number(r.messages), reactions: Number(r.reactions), voiceMinutes: Number(r.voice_minutes) })),
      channels: channels.map((c) => ({ id: c.channel_id, name: c.channel_name || c.channel_id, messages: Number(c.messages) })),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
