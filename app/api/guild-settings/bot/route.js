import { query, ensureSchema } from "@/lib/db";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Bot-facing read of a guild's feature settings (CRON_SECRET). The bot polls this and caches it,
// then no-ops on any feature whose enabled flag is false / absent. Only enabled rows matter.
export async function GET(req) {
  if (!botAuthed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!guild) return NextResponse.json({ settings: {} });
  try {
    await ensureSchema();
    const rows = await query("select feature, enabled, config from guild_settings where guild_id=$1 and enabled = true", [guild]);
    const settings = {};
    for (const r of rows) settings[r.feature] = { enabled: true, config: r.config || {} };
    return NextResponse.json({ settings }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
