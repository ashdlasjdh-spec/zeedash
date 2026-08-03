import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { dsGet, dsSet, publish, resolveUsername } from "@/lib/roblox";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET — list every player's custom emojis from the datastore.
export async function GET() {
  const s = await getSession();
  if (!s || !can(s.role, "emoji")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const defs = (await dsGet("CustomEmojis", "emojis")) || {};
    return NextResponse.json({ emojis: defs }); // { [userId]: "emoji string" }
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

// Emoji giver: per-user custom emoji string in the CustomEmojis datastore ("emojis" key).
export async function POST(req) {
  const s = await getSession();
  if (!s || !can(s.role, "emoji")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { username, userId, emojis, action = "set" } = await req.json();
  // Removing from the "loaded" list gives us a userId directly; setting resolves a username.
  let user;
  if (userId && action === "remove") user = { userId: String(userId), username: String(userId) };
  else { user = await resolveUsername(username); if (!user) return NextResponse.json({ error: "No such Roblox user" }, { status: 404 }); }

  const defs = (await dsGet("CustomEmojis", "emojis")) || {};
  if (action === "remove") delete defs[String(user.userId)];
  else defs[String(user.userId)] = String(emojis || "");
  await dsSet("CustomEmojis", "emojis", defs);
  await publish("CustomEmojiUpdate", { userId: user.userId }).catch(() => {});
  await query(`insert into audit_log (actor_id, actor_name, action, category, target, detail) values ($1,$2,'grant','emoji',$3,$4)`,
    [s.id, s.name, `${user.username} (${user.userId})`, action === "remove" ? "removed emojis" : emojis]);
  return NextResponse.json({ ok: true, target: user });
}
