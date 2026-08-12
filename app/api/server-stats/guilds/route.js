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
    // Only servers the bot is CURRENTLY in (recent full-pass) AND that the signed-in user is also in
    // (from the guilds OAuth scope). If we don't have the user's guild list yet (pre-scope session),
    // fall back to all active bot guilds so the picker isn't empty until they re-login.
    const mine = await query("select guild_ids from user_guilds where discord_id=$1", [s.id]).catch(() => []);
    const ids = Array.isArray(mine?.[0]?.guild_ids) ? mine[0].guild_ids : null;
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
