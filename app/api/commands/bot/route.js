import { query, ensureSchema } from "@/lib/db";
import { guardBot } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Bot-facing: the bot POSTs its full command reference here on startup (CRON_SECRET) so zhd.lol/bot/commands
// always reflects the live registry — no manual regenerate/copy step. Stored in config.bot_commands.
export async function POST(req) {
  const bad = guardBot(req); if (bad) return bad;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.categories)) return badRequest("Bad commands payload.");
  const payload = {
    generatedAt: new Date().toISOString(),
    prefix: String(body.prefix || "."),
    total: Number(body.total) || body.categories.reduce((n, c) => n + (c.commands?.length || 0), 0),
    categories: body.categories.slice(0, 60),
  };
  try {
    await ensureSchema();
    await query(
      `insert into config (key, value, updated_by, updated_at) values ('bot_commands', $1, 'bot', now())
       on conflict (key) do update set value = $1, updated_by = 'bot', updated_at = now()`,
      [JSON.stringify(payload)],
    );
    return NextResponse.json({ ok: true, total: payload.total });
  } catch (e) {
    return serverError(e.message);
  }
}
