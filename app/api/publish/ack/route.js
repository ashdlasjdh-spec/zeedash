import { query, ensureSchema } from "@/lib/db";
import { guardBot } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Bot-facing: mark a publish job done or failed after the bot acted on it. { id, ok, result? }.
export async function POST(req) {
  const bad = guardBot(req); if (bad) return bad;
  const { id, ok, result } = await req.json().catch(() => ({}));
  if (!id) return badRequest();
  try {
    await ensureSchema();
    await query(
      "update publish_queue set status=$2, result=$3, done_at=now() where id=$1",
      [Number(id), ok ? "done" : "failed", result ? String(result).slice(0, 500) : null],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e.message);
  }
}
