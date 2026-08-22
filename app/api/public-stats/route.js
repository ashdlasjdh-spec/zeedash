import { query } from "@/lib/db";
import { getLivePlayers } from "@/lib/gamestats";
import { resolveGuildInfo } from "@/lib/discord";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The guilds allowed to appear on the public front page. Only these servers' stats
// are ever exposed publicly — everything else the bot is in stays private.
const PUBLIC_GUILD_IDS = [
  "1447037325380157452",
  "1496219608800170004",
  "1494327144829026354",
];

// Per-guild Discord invite for the "Join Discord" button on each server's stats.
// Fill in a real invite code per guild id; unlisted guilds fall back to the main
// community invite. Codes only (no https://discord.gg/ prefix).
const DEFAULT_INVITE = "zhd";
const GUILD_INVITES = {
  "1447037325380157452": "zhd",
  "1496219608800170004": "zhdboard",
  "1494327144829026354": "zhdhof",
};
const inviteFor = (id) => `https://discord.gg/${GUILD_INVITES[id] || DEFAULT_INVITE}`;

// PUBLIC, unauthenticated community stats for the landing page — but strictly for the
// allow-listed guilds above: member counts, recent message activity, and the live
// in-game player count. Cached at the edge so the landing page can be hammered
// without touching Postgres on every hit.
export async function GET() {
  try {
    const [rows, playersInGame] = await Promise.all([
      query(
        `
        select s.guild_id,
               max(s.guild_name) as guild_name,
               max(s.guild_icon) as guild_icon,
               coalesce(sum(s.messages) filter (where s.day >= current_date - interval '29 days'), 0)::bigint as messages_30d,
               (select m.members from server_stats m
                  where m.guild_id = s.guild_id and m.members is not null
                  order by m.day desc limit 1) as members
        from server_stats s
        where s.guild_id = any($1::text[]) and s.day >= current_date - interval '45 days'
        group by s.guild_id
        order by members desc nulls last, messages_30d desc
      `,
        [PUBLIC_GUILD_IDS],
      ),
      getLivePlayers().catch(() => null),
    ]);

    // Fresh name/icon straight from Discord (falls back to the stored values if the lookup fails).
    const live = await resolveGuildInfo(rows.map((g) => g.guild_id)).catch(() => ({}));
    const guilds = rows.map((g) => {
      const li = live[String(g.guild_id)] || null;
      return {
        id: g.guild_id,
        name: li?.name || g.guild_name || "Unknown server",
        icon: li?.icon || (g.guild_icon ? `https://cdn.discordapp.com/icons/${g.guild_id}/${g.guild_icon}.png?size=96` : null),
        members: g.members == null ? null : Number(g.members),
        messages30d: Number(g.messages_30d || 0),
        invite: inviteFor(g.guild_id),
      };
    });

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
