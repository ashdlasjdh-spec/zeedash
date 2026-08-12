import { getSession } from "@/lib/session";
import { canManageGuild } from "@/lib/permissions";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Kinds the bot's publisher knows how to dispatch. Keep in sync with zee-hood-bot/publisher.js.
const KINDS = new Set(["message", "buttonpanel", "ticketpanel", "reactionseed"]);

// Enqueue a "publish" action from the dashboard (whoever manages the guild). The bot polls
// /api/publish/pending, executes it in the server, then acks. This is how the site posts embeds /
// panels without the bot needing an inbound HTTP endpoint. payload is kind-specific.
export async function POST(req) {
  const s = await getSession();
  const { guild, kind, payload } = await req.json().catch(() => ({}));
  if (!s || !canManageGuild(s, guild)) return NextResponse.json({ error: "You don't manage that server." }, { status: 403 });
  if (!guild || !KINDS.has(String(kind || ""))) return NextResponse.json({ error: "Bad guild/kind." }, { status: 400 });
  try {
    await ensureSchema();
    // Collapse duplicate pending requests of the same kind for a guild (avoid double-posts if the
    // user clicks twice before the bot polls).
    await query("delete from publish_queue where guild_id=$1 and kind=$2 and status='pending'", [String(guild), String(kind)]);
    const rows = await query(
      `insert into publish_queue (guild_id, kind, payload, created_by)
       values ($1, $2, coalesce($3::jsonb, '{}'::jsonb), $4) returning id`,
      [String(guild), String(kind), payload == null ? null : JSON.stringify(payload), s.id],
    );
    return NextResponse.json({ ok: true, id: rows[0]?.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
