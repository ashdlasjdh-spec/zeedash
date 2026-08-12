import { getSession } from "@/lib/session";
import { canPurge } from "@/lib/permissions";
import { wipeUserData } from "@/lib/wipe";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Owner-only: wipe EVERYTHING tied to one Roblox user (irreversible). Shared logic in lib/wipe.
export async function POST(req) {
  const s = await getSession();
  if (!s || !canPurge(s.id)) return NextResponse.json({ error: "Owner only." }, { status: 403 });
  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "Enter a username or ID." }, { status: 400 });
  const r = await wipeUserData({ username, actorName: s.name, actorId: s.id });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}
