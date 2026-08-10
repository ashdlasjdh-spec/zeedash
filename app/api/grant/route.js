import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { findItem } from "@/lib/catalog";
import { applyGrant } from "@/lib/grantEngine";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { category, key, username, action = "grant" } = await req.json();
  if (!category || !key || !username) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!can(s.level, category)) return NextResponse.json({ error: "Your role can't grant this" }, { status: 403 });
  if (!findItem(category, key)) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

  const user = await resolveUsername(username);
  if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });
  const uid = user.userId;

  try {
    const { warn } = await applyGrant({ category, key, uid, by: s.name, byId: s.id, action });
    await logAudit({ actorId: s.id, actorName: s.name, action, category, itemKey: key, target: `${user.username} (${uid})` });
    return NextResponse.json({ ok: true, target: user, warn });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
