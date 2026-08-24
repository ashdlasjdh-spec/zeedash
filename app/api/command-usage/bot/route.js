import { query, ensureSchema } from "@/lib/db";
import { guardBot } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Bot-facing ingest of command-usage events (CRON_SECRET). The bot batches runs and POSTs them here.
// POST { events: [{ command, actorId, actorName, guildId, slash, at }] }
export async function POST(req) {
  const bad = guardBot(req); if (bad) return bad;
  const { events } = await req.json().catch(() => ({}));
  if (!Array.isArray(events) || !events.length) return badRequest("No events.");
  const clean = events.slice(0, 1000).map((e) => ({
    command: String(e?.command || "").slice(0, 40),
    actorId: String(e?.actorId || "").slice(0, 32) || null,
    actorName: String(e?.actorName || "").slice(0, 80) || null,
    guildId: String(e?.guildId || "").slice(0, 32) || null,
    slash: !!e?.slash,
    at: typeof e?.at === "string" && !Number.isNaN(Date.parse(e.at)) ? e.at : new Date().toISOString(),
  })).filter((e) => e.command);
  if (!clean.length) return badRequest("No valid events.");
  try {
    await ensureSchema();
    // Multi-row insert via unnest — one round-trip for the whole batch.
    await query(
      `insert into command_usage (command, actor_id, actor_name, guild_id, slash, at)
       select * from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::boolean[], $6::timestamptz[])`,
      [
        clean.map((e) => e.command), clean.map((e) => e.actorId), clean.map((e) => e.actorName),
        clean.map((e) => e.guildId), clean.map((e) => e.slash), clean.map((e) => e.at),
      ],
    );
    return NextResponse.json({ ok: true, inserted: clean.length });
  } catch (e) {
    return serverError(e.message);
  }
}
