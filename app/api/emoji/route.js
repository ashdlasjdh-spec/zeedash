import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { dsGet, dsSet, publish, resolveUsername } from "@/lib/roblox";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Split into individual emojis (grapheme clusters), dropping stray brackets/space.
function splitEmojis(input) {
  if (!input) return [];
  let parts;
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    parts = [...seg.segment(String(input))].map((s) => s.segment);
  } catch {
    parts = Array.from(String(input)); // fallback if Intl.Segmenter unavailable
  }
  return parts.filter((s) => s.trim() !== "" && s !== "[" && s !== "]");
}
// Wrap EACH emoji in its own [ ], space separated -> "[😀] [⭐]".
function bracket(list) { return list.map((e) => "[" + e + "]").join(" "); }

// GET — list every player's custom emojis from the datastore.
export async function GET() {
  const s = await getSession();
  if (!s || !can(s.level, "emoji")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const defs = (await dsGet("CustomEmojis", "emojis")) || {};
    return NextResponse.json({ emojis: defs }); // { [userId]: "emoji string" }
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

// Emoji giver: per-user custom emoji string in the CustomEmojis datastore ("emojis" key).
// action: "set" (replace all) | "add" (append to existing, de-duped) | "remove" (clear).
export async function POST(req) {
  const s = await getSession();
  if (!s || !can(s.level, "emoji")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { username, userId, emojis, action = "set" } = await req.json();
  let user;
  if (userId && action === "remove") user = { userId: String(userId), username: String(userId) };
  else { user = await resolveUsername(username); if (!user) return NextResponse.json({ error: "No such Roblox user" }, { status: 404 }); }

  const defs = (await dsGet("CustomEmojis", "emojis")) || {};
  const uid = String(user.userId);
  let stored = "";
  if (action === "remove") {
    delete defs[uid];
  } else if (action === "add") {
    const merged = [...new Set([...splitEmojis(defs[uid] || ""), ...splitEmojis(emojis)])];
    stored = bracket(merged);
    defs[uid] = stored;
  } else {
    stored = bracket(splitEmojis(emojis));
    defs[uid] = stored;
  }
  await dsSet("CustomEmojis", "emojis", defs);
  await publish("CustomEmojiUpdate", { userId: user.userId }).catch(() => {});
  await logAudit({ actorId: s.id, actorName: s.name, action: action === "remove" ? "revoke" : "grant", category: "emoji",
    target: `${user.username} (${user.userId})`, detail: action === "remove" ? "removed emojis" : stored });
  return NextResponse.json({ ok: true, target: user, value: stored });
}
