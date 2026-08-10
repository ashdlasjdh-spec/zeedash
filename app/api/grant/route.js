import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { findItem } from "@/lib/catalog";
import { applyGrant } from "@/lib/grantEngine";
import { logAudit, query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { category, key, username, action = "grant", days } = await req.json();
  if (!category || !key || !username) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!can(s.level, category)) return NextResponse.json({ error: "Your role can't grant this" }, { status: 403 });
  if (!findItem(category, key)) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

  const user = await resolveUsername(username);
  if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });
  const uid = user.userId;
  const expDays = Number(days) || 0; // >0 = temporary grant that auto-revokes after N days

  try {
    const { warn } = await applyGrant({ category, key, uid, by: s.name, byId: s.id, action });

    // Temporary-grant bookkeeping: record an expiry on a temp grant; clear any expiry when the
    // grant is made permanent (grant with no days) or revoked. The sweeper reads grant_expiry.
    try {
      await ensureSchema();
      if (action === "grant" && expDays > 0) {
        await query(
          `insert into grant_expiry (user_id, category, item_key, expires_at, granted_by)
           values ($1,$2,$3, now() + ($4 || ' days')::interval, $5)
           on conflict (user_id, category, item_key) do update set expires_at = excluded.expires_at, granted_by = excluded.granted_by`,
          [uid, category, key, String(expDays), s.id],
        );
      } else {
        await query("delete from grant_expiry where user_id=$1 and category=$2 and item_key=$3", [uid, category, key]);
      }
    } catch { /* expiry is best-effort; the grant itself already succeeded */ }

    await logAudit({
      actorId: s.id, actorName: s.name, action, category, itemKey: key,
      target: `${user.username} (${uid})`, detail: action === "grant" && expDays > 0 ? `expires in ${expDays}d` : null,
    });
    return NextResponse.json({ ok: true, target: user, warn, expiresInDays: action === "grant" && expDays > 0 ? expDays : null });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
