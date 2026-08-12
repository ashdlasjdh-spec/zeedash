import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight list of servers the bot has stats for — drives the Server Management sidebar picker.
// STRICTLY the servers where the signed-in user holds Discord admin/owner (the Roblox ladder grants
// nothing here). Returns id, name and Discord icon (most-recently-active first).
export async function GET() {
  const s = await getSession();
  if (!s || !canAccessServerSection(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const ids = s.serverGuildIds || [];
    if (!ids.length) return NextResponse.json({ guilds: [] }, { headers: { "cache-control": "no-store" } });
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
