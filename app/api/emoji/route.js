import { getSession } from "@/lib/session";
import { canCat } from "@/lib/permissions";
import { dsGet } from "@/lib/roblox";
import { applyEmoji } from "@/lib/emoji";
import { NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET — list every player's custom emojis from the datastore.
export async function GET() {
  const s = await getSession();
  if (!s || !canCat(s, "emoji")) return forbidden();
  try {
    const defs = (await dsGet("CustomEmojis", "emojis")) || {};
    return NextResponse.json({ emojis: defs }); // { [userId]: "emoji string" }
  } catch (e) { return serverError(e.message); }
}

// Emoji giver: set (replace all) | add (append) | remove (clear).
export async function POST(req) {
  const s = await getSession();
  if (!s || !canCat(s, "emoji")) return forbidden();
  const { username, userId, emojis, action = "set" } = await req.json();
  try {
    const r = await applyEmoji({ username, userId, emojis, action, actorName: s.name, actorId: s.id });
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
    return NextResponse.json(r);
  } catch (e) {
    // Surface the real reason (e.g. the detailed DataStore/Open Cloud error) instead of a blank 500.
    return serverError(e.message || "Emoji update failed.");
  }
}
