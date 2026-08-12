import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight list of servers the bot has stats for — drives the Server Management sidebar picker.
// Management+ only. Returns id, name and Discord icon hash (most-recently-active first).
export async function GET() {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    // Only servers the bot is CURRENTLY in: its stats full-pass refreshes every active guild each
    // ~minute, so anything not updated recently is a guild the bot has left — hide it.
    const rows = await query(
      "select guild_id, max(guild_name) name, max(guild_icon) icon, max(updated_at) last from server_stats group by guild_id having max(updated_at) > now() - interval '20 minutes' order by max(updated_at) desc",
    );
    return NextResponse.json({ guilds: rows.map((g) => ({ id: g.guild_id, name: g.name || g.guild_id, icon: g.icon || null })) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
