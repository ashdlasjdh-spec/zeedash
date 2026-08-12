import { canConfig } from "@/lib/permissions";
import { syncDbToGame } from "@/lib/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Bot-facing sync (CRON_SECRET). Actor level re-checked (co owners+).
export async function POST(req) {
  const auth = req.headers.get("authorization") || "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { actorName, actorId, actorLevel } = await req.json().catch(() => ({}));
  if (!canConfig(Number(actorLevel) || 0)) return NextResponse.json({ error: "Your rank can't run a sync (co owners+)." }, { status: 403 });
  try {
    const r = await syncDbToGame({ actorName: actorName || "Discord", actorId: actorId || "bot" });
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: `Sync failed: ${e?.message || String(e)}` }, { status: 500 });
  }
}
