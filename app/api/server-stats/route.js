import { getSession } from "@/lib/session";
import { canAccessServerSection, canManageGuild, staffCanManageServers } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Server analytics for the dashboard "Server" page. Roblox staff, or a Discord admin of the guild.
export async function GET(req) {
  const s = await getSession();
  if (!s || !canAccessServerSection(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const days = Math.min(90, Math.max(7, parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30));
  let guild = req.nextUrl.searchParams.get("guild") || "";

  try {
    // Server switcher list: staff see every guild they share with the bot; a Discord admin sees only
    // the guilds they hold admin/owner in.
    const staff = staffCanManageServers(s.level);
    let ids;
    if (staff) {
      const mine = await query("select guild_ids from user_guilds where discord_id=$1", [s.id]).catch(() => []);
      ids = Array.isArray(mine?.[0]?.guild_ids) ? mine[0].guild_ids : null;
    } else {
      ids = s.serverGuildIds || [];
      if (!ids.length) return NextResponse.json({ guilds: [], guild: null, days });
    }
    const gBase = "select guild_id, max(guild_name) guild_name, max(guild_icon) guild_icon, sum(messages)::bigint messages, max(updated_at) last from server_stats";
    const gTail = "group by guild_id having max(updated_at) > now() - interval '20 minutes' order by max(updated_at) desc";
    const guilds = ids && ids.length
      ? await query(`${gBase} where guild_id = any($1::text[]) ${gTail}`, [ids])
      : await query(`${gBase} ${gTail}`);
    if (!guild && guilds[0]) guild = guilds[0].guild_id;
    if (!guild) return NextResponse.json({ guilds: [], guild: null, days });
    if (!canManageGuild(s, guild)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [series, totals, prev, channels, latestMembers] = await Promise.all([
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
      // Previous equal-length window, for the % change badges.
      query(
        `select coalesce(sum(messages),0)::bigint messages, coalesce(sum(reactions),0)::bigint reactions,
                coalesce(sum(voice_minutes),0)::bigint voice_minutes from server_stats
         where guild_id=$1 and day >= current_date - ($2 || ' days')::interval and day < current_date - ($3 || ' days')::interval`,
        [guild, String(2 * days - 1), String(days - 1)],
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
      guilds: guilds.map((g) => ({ guildId: g.guild_id, guildName: g.guild_name || g.guild_id, icon: g.guild_icon || null, messages: Number(g.messages) })),
      guild, days,
      totals: {
        messages: Number(totals[0]?.messages || 0),
        reactions: Number(totals[0]?.reactions || 0),
        voiceMinutes: Number(totals[0]?.voice_minutes || 0),
        members: latestMembers[0]?.members ?? null,
      },
      prev: {
        messages: Number(prev[0]?.messages || 0),
        reactions: Number(prev[0]?.reactions || 0),
        voiceMinutes: Number(prev[0]?.voice_minutes || 0),
      },
      series: series.map((r) => ({ d: r.d, messages: Number(r.messages), reactions: Number(r.reactions), voiceMinutes: Number(r.voice_minutes) })),
      channels: channels.map((c) => ({ id: c.channel_id, name: c.channel_name || c.channel_id, messages: Number(c.messages) })),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
