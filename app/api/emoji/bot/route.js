import { can } from "@/lib/permissions";
import { applyEmoji } from "@/lib/emoji";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Bot-facing emoji giver (CRON_SECRET). Actor + level passed in and re-checked (emoji = co founders+).
export async function POST(req) {
  if (!botAuthed(req)) {
    return forbidden();
  }
  const { username, userId, emojis, action = "set", actorName, actorId, actorLevel } = await req.json().catch(() => ({}));
  if (!can(Number(actorLevel) || 0, "emoji")) return forbidden("Your rank can't manage emojis.");
  try {
    const r = await applyEmoji({ username, userId, emojis, action, actorName: actorName || "Discord", actorId: actorId || "bot" });
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
    return NextResponse.json(r);
  } catch (e) {
    // Surface the real reason to the bot's reply instead of a blank "Emoji update failed (500)".
    return serverError(e.message || "Emoji update failed.");
  }
}
