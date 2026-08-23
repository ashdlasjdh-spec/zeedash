import { can } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { findItem } from "@/lib/catalog";
import { applyGrant } from "@/lib/grantEngine";
import { logAudit, query, ensureSchema } from "@/lib/db";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function humanDur(sec) {
  for (const [lbl, v] of [["w", 604800], ["d", 86400], ["h", 3600], ["m", 60], ["s", 1]]) {
    if (sec % v === 0) return `${sec / v}${lbl}`;
  }
  return `${sec}s`;
}

// Bot-facing grant/revoke — same effects as /api/grant, but authenticated by CRON_SECRET (the bot
// has no dashboard session). The actor (staff member running the Discord command) is passed in and
// their level is re-checked here as defence-in-depth. Writes to the shared audit_log like the site.
export async function POST(req) {
  if (!botAuthed(req)) {
    return forbidden();
  }
  const { category, key, username, action = "grant", seconds, actorName, actorId, actorLevel } = await req.json().catch(() => ({}));
  if (!category || !key || !username) return badRequest("Missing fields");
  if (!can(Number(actorLevel) || 0, category)) return forbidden("Your rank can't grant this category.");
  if (!findItem(category, key)) return badRequest("Unknown item");

  const user = await resolveUsername(username);
  if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });
  const uid = user.userId;
  const expSecs = Math.max(0, Math.floor(Number(seconds) || 0));

  try {
    const { warn } = await applyGrant({ category, key, uid, by: actorName || "Discord", byId: actorId || "bot", action });

    try {
      await ensureSchema();
      if (action === "grant" && expSecs > 0) {
        await query(
          `insert into grant_expiry (user_id, category, item_key, expires_at, granted_by)
           values ($1,$2,$3, now() + ($4 || ' seconds')::interval, $5)
           on conflict (user_id, category, item_key) do update set expires_at = excluded.expires_at, granted_by = excluded.granted_by`,
          [uid, category, key, String(expSecs), actorId || null],
        );
      } else {
        await query("delete from grant_expiry where user_id=$1 and category=$2 and item_key=$3", [uid, category, key]);
      }
    } catch { /* expiry best-effort */ }

    const expiresIn = action === "grant" && expSecs > 0 ? humanDur(expSecs) : null;
    await logAudit({
      actorId, actorName, action, category, itemKey: key,
      target: `${user.username} (${uid})`, detail: expiresIn ? `expires in ${expiresIn}` : null,
    });
    return NextResponse.json({ ok: true, target: user, warn, expiresIn });
  } catch (e) {
    return serverError(e.message);
  }
}
