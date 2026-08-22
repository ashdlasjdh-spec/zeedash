import { query } from "@/lib/db";
import { getLivePlayers } from "@/lib/gamestats";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUBLIC, unauthenticated community stats for the landing page: the servers the
// bot is active in, their member counts, and recent message activity, plus the
// live in-game player count. Intentionally open — this is the public front page.
//
// "Active" = a guild the bot has reported stats for in the last 2 days, so servers
// it was removed from drop off on their own. Cached at the edge so the landing page
// can be hammered without touching Postgres on every hit.
export async function GET() {
  try {
    const [rows, playersInGame] = await Promise.all([
      query(`
        select s.guild_id,
               max(s.guild_name) as guild_name,
               max(s.guild_icon) as guild_icon,
               coalesce(sum(s.messages) filter (where s.day >= current_date - interval '29 days'), 0)::bigint as messages_30d,
               (select m.members from server_stats m
                  where m.guild_id = s.guild_id and m.members is not null
                  order by m.day desc limit 1) as members
        from server_stats s
        where s.day >= current_date - interval '45 days'
        group by s.guild_id
        having max(s.updated_at) > now() - interval '2 days'
        order by members desc nulls last, messages_30d desc
        limit 60
      `),
      getLivePlayers().catch(() => null),
    ]);

    const guilds = rows.map((g) => ({
      id: g.guild_id,
      name: g.guild_name || "Unknown server",
      icon: g.guild_icon ? `https://cdn.discordapp.com/icons/${g.guild_id}/${g.guild_icon}.png?size=80` : null,
      members: g.members == null ? null : Number(g.members),
      messages30d: Number(g.messages_30d || 0),
    }));

    const totals = {
      servers: guilds.length,
      members: guilds.reduce((n, g) => n + (g.members || 0), 0),
      messages30d: guilds.reduce((n, g) => n + g.messages30d, 0),
      playersInGame: playersInGame == null ? null : Number(playersInGame),
    };

    return NextResponse.json(
      { totals, guilds },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (e) {
    // Never break the landing page on a stats hiccup — return an empty, valid shape.
    return NextResponse.json(
      { totals: { servers: 0, members: 0, messages30d: 0, playersInGame: null }, guilds: [], error: e.message },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
