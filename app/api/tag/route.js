import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { setTag, deleteTag } from "@/lib/perksApi";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  const s = await getSession();
  if (!s || !can(s.role, "tag")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId, def, rank } = await req.json();
  if (!groupId || !def) return NextResponse.json({ error: "Missing groupId/def" }, { status: 400 });
  try {
    await setTag(groupId, rank, def);
    await query(`insert into audit_log (actor_id, actor_name, action, category, target, detail) values ($1,$2,'grant','tag',$3,$4)`,
      [s.id, s.name, String(groupId), rank ? `rank ${rank}` : "group-wide"]);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req) {
  const s = await getSession();
  if (!s || !can(s.role, "tag")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId, rank } = await req.json();
  try { await deleteTag(groupId, rank); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
