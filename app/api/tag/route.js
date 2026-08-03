import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { setTag, deleteTag, listTags } from "@/lib/perksApi";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET — list every crew tag in the shared DB.
export async function GET() {
  const s = await getSession();
  if (!s || !can(s.role, "tag")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { tags } = await listTags();
    return NextResponse.json({ tags: tags || {} });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !can(s.role, "tag")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId, def, rank } = await req.json();
  if (!groupId || !def) return NextResponse.json({ error: "Missing groupId/def" }, { status: 400 });
  try {
    await setTag(groupId, rank, def);
    await logAudit({ actorId: s.id, actorName: s.name, action: "grant", category: "tag", target: String(groupId), detail: rank ? `rank ${rank}` : "group-wide" });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req) {
  const s = await getSession();
  if (!s || !can(s.role, "tag")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId, rank } = await req.json();
  try {
    await deleteTag(groupId, rank);
    await logAudit({ actorId: s.id, actorName: s.name, action: "revoke", category: "tag", target: String(groupId), detail: rank ? `rank ${rank}` : "group-wide" });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
