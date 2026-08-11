import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { findItem } from "@/lib/catalog";
import { applyGrant } from "@/lib/grantEngine";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Grant (or revoke) one item to a whole pasted list of players at once — permanent only.
// Same permission gate + engine as the single grant, so effects are identical per user.
export async function POST(req) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { category, key, users, action = "grant" } = await req.json();
  if (!category || !key || !Array.isArray(users) || !users.length) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!can(s.level, category)) return NextResponse.json({ error: "Your role can't grant this" }, { status: 403 });
  if (!findItem(category, key)) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

  const list = [...new Set(users.map((u) => String(u).trim()).filter(Boolean))].slice(0, 500);
  let done = 0;
  const errors = [];
  for (const input of list) {
    try {
      const user = await resolveUsername(input);
      if (!user) { errors.push(`${input}: no such user`); continue; }
      const { warn } = await applyGrant({ category, key, uid: user.userId, by: s.name, byId: s.id, action });
      done++;
      if (warn) errors.push(`${user.username}: ${warn}`);
    } catch (e) { errors.push(`${input}: ${e.message}`); }
  }

  await logAudit({
    actorId: s.id, actorName: s.name, action, category, itemKey: key,
    target: `bulk ${done}/${list.length}`, detail: `bulk ${action} — ${done} ok, ${errors.length} issue(s)`,
  });
  return NextResponse.json({ ok: true, done, total: list.length, failed: errors.length, errors: errors.slice(0, 20) });
}
