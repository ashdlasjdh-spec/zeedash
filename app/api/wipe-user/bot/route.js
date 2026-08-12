import { canPurge } from "@/lib/permissions";
import { wipeUserData } from "@/lib/wipe";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Bot-facing wipe (CRON_SECRET). Only the named owner Discord IDs (canPurge) may trigger it — the
// bot passes the acting owner's id, and it's re-checked here. Same engine as the site wipe.
export async function POST(req) {
  const auth = req.headers.get("authorization") || "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { username, actorName, actorId } = await req.json().catch(() => ({}));
  if (!username) return NextResponse.json({ error: "Enter a username or ID." }, { status: 400 });
  if (!canPurge(String(actorId))) return NextResponse.json({ error: "Owner only." }, { status: 403 });
  const r = await wipeUserData({ username, actorName: actorName || "Discord", actorId: String(actorId) });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}
