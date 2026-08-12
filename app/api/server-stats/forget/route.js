import { query, ensureSchema } from "@/lib/db";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Bot calls this when it's removed from a guild (guildDelete) so the server drops out of the picker
// and its stats stop lingering. CRON_SECRET-gated.
export async function POST(req) {
  if (!botAuthed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  const { guild } = await req.json().catch(() => ({}));
  if (!guild) return NextResponse.json({ error: "guild required" }, { status: 400 });
  try {
    await ensureSchema();
    for (const t of ["server_stats", "channel_stats", "member_stats"]) {
      await query(`delete from ${t} where guild_id = $1`, [String(guild)]).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
