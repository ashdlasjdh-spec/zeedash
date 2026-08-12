import { getSession } from "@/lib/session";
import { canAccessServerSection, staffCanManageServers } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight list of servers the bot has stats for — drives the Server Management sidebar picker.
// Roblox staff see every server they share with the bot; a plain Discord admin sees ONLY the servers
// where they hold admin/owner. Returns id, name and Discord icon (most-recently-active first).
export async function GET() {
  const s = await getSession();
  if (!s || !canAccessServerSection(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const staff = staffCanManageServers(s.level);
    let ids;
    if (staff) {
      // Staff: all guilds they share with the bot (from the guilds OAuth scope); null = all active.
      const mine = await query("select guild_ids from user_guilds where discord_id=$1", [s.id]).catch(() => []);
      ids = Array.isArray(mine?.[0]?.guild_ids) ? mine[0].guild_ids : null;
    } else {
      // Server-only Discord admin: strictly the guilds they hold admin/owner in.
      ids = s.serverGuildIds || [];
      if (!ids.length) return NextResponse.json({ guilds: [] }, { headers: { "cache-control": "no-store" } });
    }
    const base = "select guild_id, max(guild_name) name, max(guild_icon) icon, max(updated_at) last from server_stats";
    const tail = "group by guild_id having max(updated_at) > now() - interval '20 minutes' order by max(updated_at) desc";
    const rows = ids && ids.length
      ? await query(`${base} where guild_id = any($1::text[]) ${tail}`, [ids])
      : await query(`${base} ${tail}`);
    return NextResponse.json({ guilds: rows.map((g) => ({ id: g.guild_id, name: g.name || g.guild_id, icon: g.icon || null })) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
