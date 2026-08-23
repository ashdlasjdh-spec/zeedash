import { syncDbToGame } from "@/lib/sync";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CO_FOUNDER = 254; // co founders and up may run a sync

// Bot-facing sync (CRON_SECRET). Actor level re-checked (co founders+).
export async function POST(req) {
  if (!botAuthed(req)) {
    return forbidden();
  }
  const { actorName, actorId, actorLevel } = await req.json().catch(() => ({}));
  if ((Number(actorLevel) || 0) < CO_FOUNDER) return forbidden("Your rank can't run a sync (co founders+).");
  try {
    const r = await syncDbToGame({ actorName: actorName || "Discord", actorId: actorId || "bot" });
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: `Sync failed: ${e?.message || String(e)}` }, { status: 500 });
  }
}
