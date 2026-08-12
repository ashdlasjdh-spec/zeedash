import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { dsGet } from "@/lib/roblox";
import { applyEmoji } from "@/lib/emoji";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET — list every player's custom emojis from the datastore.
export async function GET() {
  const s = await getSession();
  if (!s || !can(s.level, "emoji")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const defs = (await dsGet("CustomEmojis", "emojis")) || {};
    return NextResponse.json({ emojis: defs }); // { [userId]: "emoji string" }
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

// Emoji giver: set (replace all) | add (append) | remove (clear).
export async function POST(req) {
  const s = await getSession();
  if (!s || !can(s.level, "emoji")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { username, userId, emojis, action = "set" } = await req.json();
  const r = await applyEmoji({ username, userId, emojis, action, actorName: s.name, actorId: s.id });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json(r);
}
