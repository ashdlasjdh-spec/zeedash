import { canPurge } from "@/lib/permissions";
import { wipeUserData } from "@/lib/wipe";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { badRequest, forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Bot-facing wipe (CRON_SECRET). Only the named owner Discord IDs (canPurge) may trigger it — the
// bot passes the acting owner's id, and it's re-checked here. Same engine as the site wipe.
export async function POST(req) {
  if (!botAuthed(req)) {
    return forbidden();
  }
  const { username, actorName, actorId } = await req.json().catch(() => ({}));
  if (!username) return badRequest("Enter a username or ID.");
  if (!canPurge(String(actorId))) return forbidden("Owner only.");
  const r = await wipeUserData({ username, actorName: actorName || "Discord", actorId: String(actorId) });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}
