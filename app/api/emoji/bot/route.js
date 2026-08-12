import { can } from "@/lib/permissions";
import { applyEmoji } from "@/lib/emoji";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Bot-facing emoji giver (CRON_SECRET). Actor + level passed in and re-checked (emoji = co founders+).
export async function POST(req) {
  if (!botAuthed(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { username, userId, emojis, action = "set", actorName, actorId, actorLevel } = await req.json().catch(() => ({}));
  if (!can(Number(actorLevel) || 0, "emoji")) return NextResponse.json({ error: "Your rank can't manage emojis." }, { status: 403 });
  const r = await applyEmoji({ username, userId, emojis, action, actorName: actorName || "Discord", actorId: actorId || "bot" });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}
