import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { findItem } from "@/lib/catalog";
import { applyGrant } from "@/lib/grantEngine";
import { logAudit, query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

// Format a whole number of seconds as the largest exact unit (1w / 1d / 1h / 1m / 1s).
function humanDur(sec) {
  for (const [lbl, v] of [["w", 604800], ["d", 86400], ["h", 3600], ["m", 60], ["s", 1]]) {
    if (sec % v === 0) return `${sec / v}${lbl}`;
  }
  return `${sec}s`;
}

export async function POST(req) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { category, key, username, action = "grant", seconds } = await req.json();
  if (!category || !key || !username) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!can(s.level, category)) return NextResponse.json({ error: "Your role can't grant this" }, { status: 403 });
  if (!findItem(category, key)) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

  const user = await resolveUsername(username);
  if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });
  const uid = user.userId;
  const expSecs = Math.max(0, Math.floor(Number(seconds) || 0)); // >0 = temporary; auto-revokes after this long

  try {
    const { warn } = await applyGrant({ category, key, uid, by: s.name, byId: s.id, action });

    // Temporary-grant bookkeeping: record an expiry on a temp grant; clear any expiry when the
    // grant is made permanent (grant with no duration) or revoked. The sweeper reads grant_expiry.
    try {
      await ensureSchema();
      if (action === "grant" && expSecs > 0) {
        await query(
          `insert into grant_expiry (user_id, category, item_key, expires_at, granted_by)
           values ($1,$2,$3, now() + ($4 || ' seconds')::interval, $5)
           on conflict (user_id, category, item_key) do update set expires_at = excluded.expires_at, granted_by = excluded.granted_by`,
          [uid, category, key, String(expSecs), s.id],
        );
      } else {
        await query("delete from grant_expiry where user_id=$1 and category=$2 and item_key=$3", [uid, category, key]);
      }
    } catch { /* expiry is best-effort; the grant itself already succeeded */ }

    const expiresIn = action === "grant" && expSecs > 0 ? humanDur(expSecs) : null;
    await logAudit({
      actorId: s.id, actorName: s.name, action, category, itemKey: key,
      target: `${user.username} (${uid})`, detail: expiresIn ? `expires in ${expiresIn}` : null,
    });
    return NextResponse.json({ ok: true, target: user, warn, expiresIn });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
