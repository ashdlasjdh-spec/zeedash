import { getSession } from "@/lib/session";
import { canPurge } from "@/lib/permissions";
import { limited } from "@/lib/ratelimit";
import { wipeUserData } from "@/lib/wipe";
import { NextResponse } from "next/server";
import { badRequest, forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Owner-only: wipe EVERYTHING tied to one Roblox user (irreversible). Shared logic in lib/wipe.
export async function POST(req) {
  const s = await getSession();
  if (!s || !canPurge(s.id)) return forbidden("Owner only.");
  const capped = await limited(`wipeuser:${s.id}`, { max: 10, windowSec: 60 }); if (capped) return capped;
  const { username } = await req.json();
  if (!username) return badRequest("Enter a username or ID.");
  const r = await wipeUserData({ username, actorName: s.name, actorId: s.id });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}
