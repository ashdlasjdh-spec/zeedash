import { getSession } from "@/lib/session";
import { canWhitelist, PURGE_OWNER_IDS } from "@/lib/permissions";
import { query, logAudit, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Blacklisted Discord users can't use the site at all. Co founders+ manage the list.
export async function GET() {
  const s = await getSession();
  if (!s || !canWhitelist(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await ensureSchema();
    const list = await query("select discord_id, note, added_by, added_at from blacklist order by added_at desc");
    return NextResponse.json({ list });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canWhitelist(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { discordId, note } = await req.json();
  const id = String(discordId || "").trim();
  if (!/^\d{5,}$/.test(id)) return NextResponse.json({ error: "Enter a valid Discord user ID." }, { status: 400 });
  if (id === String(s.id)) return NextResponse.json({ error: "You can't blacklist yourself." }, { status: 400 });
  if (PURGE_OWNER_IDS.includes(id)) return NextResponse.json({ error: "That owner can't be blacklisted." }, { status: 400 });
  try {
    await ensureSchema();
    await query(
      `insert into blacklist (discord_id, note, added_by) values ($1,$2,$3)
       on conflict (discord_id) do update set note = excluded.note, added_by = excluded.added_by`,
      [id, String(note || "").slice(0, 200) || null, s.id],
    );
    await logAudit({ actorId: s.id, actorName: s.name, action: "blacklist", category: "access", target: id, detail: note ? String(note).slice(0, 120) : "blocked from site" });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req) {
  const s = await getSession();
  if (!s || !canWhitelist(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { discordId } = await req.json();
  const id = String(discordId || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await query("delete from blacklist where discord_id=$1", [id]);
    await logAudit({ actorId: s.id, actorName: s.name, action: "unblacklist", category: "access", target: id, detail: "restored site access" });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
