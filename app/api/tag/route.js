import { getSession } from "@/lib/session";
import { canCat } from "@/lib/permissions";
import { setTag, deleteTag, listTags } from "@/lib/perksApi";
import { pushTag, unpushTag } from "@/lib/crewtags";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET — list every crew tag in the shared DB.
export async function GET() {
  const s = await getSession();
  if (!s || !canCat(s, "tag")) return forbidden();
  try {
    const { tags } = await listTags();
    return NextResponse.json({ tags: tags || {} });
  } catch (e) { return serverError(e.message); }
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canCat(s, "tag")) return forbidden();
  const { groupId, def, rank } = await req.json();
  if (!groupId || !def) return badRequest("Missing groupId/def");
  try {
    // Push into the game first (this is what actually makes the tag show up); the
    // perks-api DB write is only a durable mirror for the "Load" list, best-effort.
    await pushTag(groupId, rank, def, s.name);
    try { await setTag(groupId, rank, def); } catch (e) { console.error("[tag] DB mirror failed:", e.message); }
    await logAudit({ actorId: s.id, actorName: s.name, action: "grant", category: "tag", target: String(groupId), detail: rank ? `rank ${rank}` : "group-wide" });
    return NextResponse.json({ ok: true });
  } catch (e) { return serverError(e.message); }
}

export async function DELETE(req) {
  const s = await getSession();
  if (!s || !canCat(s, "tag")) return forbidden();
  const { groupId, rank } = await req.json();
  try {
    await unpushTag(groupId, rank);
    try { await deleteTag(groupId, rank); } catch (e) { console.error("[tag] DB mirror delete failed:", e.message); }
    await logAudit({ actorId: s.id, actorName: s.name, action: "revoke", category: "tag", target: String(groupId), detail: rank ? `rank ${rank}` : "group-wide" });
    return NextResponse.json({ ok: true });
  } catch (e) { return serverError(e.message); }
}
