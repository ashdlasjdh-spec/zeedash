import { canBan } from "@/lib/permissions";
import { banAction, lookupBan } from "@/lib/bans";
import { botAuthed as authed } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { badRequest, forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET ?user=X — look up a user's game-ban status (mod+). Actor level via x-actor-level header.
export async function GET(req) {
  if (!authed(req)) return forbidden();
  if (!canBan(Number(req.headers.get("x-actor-level")) || 0)) return forbidden("Mod+ only.");
  const user = req.nextUrl.searchParams.get("user");
  if (!user) return badRequest("Provide a user.");
  const r = await lookupBan(user);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}

// POST { user, action:ban|unban|kick|warn, reason, duration, actor* } — mod+.
export async function POST(req) {
  if (!authed(req)) return forbidden();
  const { user, action = "ban", reason, duration, evidence, actorName, actorId, actorLevel } = await req.json().catch(() => ({}));
  if (!canBan(Number(actorLevel) || 0)) return forbidden("Mod+ only.");
  if (!user) return badRequest("Provide a user.");
  const r = await banAction({ input: user, action, reason, duration, evidence, actorName: actorName || "Discord", actorId: actorId || "bot" });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}
