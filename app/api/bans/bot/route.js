import { canBan } from "@/lib/permissions";
import { banAction, lookupBan } from "@/lib/bans";
import { botAuthed as authed } from "@/lib/botauth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET ?user=X — look up a user's game-ban status (mod+). Actor level via x-actor-level header.
export async function GET(req) {
  if (!authed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canBan(Number(req.headers.get("x-actor-level")) || 0)) return NextResponse.json({ error: "Mod+ only." }, { status: 403 });
  const user = req.nextUrl.searchParams.get("user");
  if (!user) return NextResponse.json({ error: "Provide a user." }, { status: 400 });
  const r = await lookupBan(user);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}

// POST { user, action:ban|unban|kick|warn, reason, duration, actor* } — mod+.
export async function POST(req) {
  if (!authed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user, action = "ban", reason, duration, evidence, actorName, actorId, actorLevel } = await req.json().catch(() => ({}));
  if (!canBan(Number(actorLevel) || 0)) return NextResponse.json({ error: "Mod+ only." }, { status: 403 });
  if (!user) return NextResponse.json({ error: "Provide a user." }, { status: 400 });
  const r = await banAction({ input: user, action, reason, duration, evidence, actorName: actorName || "Discord", actorId: actorId || "bot" });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}
