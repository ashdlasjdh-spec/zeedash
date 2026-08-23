import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";
import { logAudit } from "@/lib/db";
import { botAuthed } from "@/lib/botauth";

export const dynamic = "force-dynamic";

// Bot → site audit log. The Discord bot posts its moderation / group actions here (CRON_SECRET-gated)
// so they show up in the dashboard's audit log AND the moderation analytics, alongside site actions.
export async function POST(req) {
  if (!botAuthed(req)) {
    return forbidden();
  }
  const b = await req.json().catch(() => ({}));
  if (!b.action) return badRequest("Missing action");
  try {
    await logAudit({
      actorId: b.actorId || null,
      actorName: b.actorName || null,
      action: String(b.action).toLowerCase().slice(0, 40),
      category: b.category || null,
      itemKey: b.itemKey || null,
      target: b.target || null,
      detail: b.detail || null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e.message);
  }
}
