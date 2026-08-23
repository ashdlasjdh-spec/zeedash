import { applyGrant } from "@/lib/grantEngine";
import { query, logAudit, ensureSchema } from "@/lib/db";
import { setConfig } from "@/lib/config";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Called by Vercel Cron on a schedule (see vercel.json). Revokes any grant whose temporary
// duration has elapsed — same revoke path as a manual removal (in-game DataStore + shared DB),
// then drops the expiry row and logs an audit entry. Protected by CRON_SECRET: Vercel sends it
// as `Authorization: Bearer <CRON_SECRET>`, so only the cron (or an owner with the secret) runs it.
async function handle(req) {
  if (!botAuthed(req)) return unauthorized("Forbidden");

  try {
    await ensureSchema();
    // Heartbeat: the 24/7 bot pings this endpoint every ~15s, so a fresh last_sweep_at is proof
    // the bot + dashboard + DB are all alive. The Overview status badges read it. Best-effort.
    try { await setConfig("last_sweep_at", new Date().toISOString(), "system"); } catch {}
    // The bot's ping carries its boot time + build id (POST body). Persist them so /status can show
    // "bot up Xm · build abc123" — the at-a-glance proof that a redeploy actually took. GET (Vercel
    // cron) has no body; guard on method + swallow parse errors so the sweep never depends on this.
    if (req.method === "POST") {
      try {
        const b = await req.json();
        if (b && typeof b === "object") {
          if (b.bootAt) await setConfig("bot_boot_at", String(b.bootAt).slice(0, 40), "system");
          if (b.build) await setConfig("bot_build", String(b.build).slice(0, 40), "system");
        }
      } catch { /* no/invalid body — heartbeat still counts */ }
    }
    const due = await query(
      "select user_id, category, item_key from grant_expiry where expires_at <= now() order by expires_at limit 500",
    );
    let revoked = 0;
    const errors = [];
    for (const r of due) {
      try {
        const { warn } = await applyGrant({ category: r.category, key: r.item_key, uid: r.user_id, by: "auto-expire", byId: "system", action: "revoke" });
        if (warn) {
          // The shared-DB removal didn't confirm — KEEP the expiry row so the next sweep retries,
          // instead of silently leaving the perk in the DB. Record why.
          errors.push(`${r.user_id}/${r.category}:${r.item_key}: ${warn}`);
          continue;
        }
        await query("delete from grant_expiry where user_id = $1 and category = $2 and item_key = $3", [r.user_id, r.category, r.item_key]);
        revoked++;
        await logAudit({
          actorId: "system", actorName: "Auto-expire", action: "revoke", category: r.category, itemKey: r.item_key,
          target: r.user_id, detail: "temporary grant expired",
        });
      } catch (e) {
        errors.push(`${r.user_id}/${r.category}:${r.item_key}: ${e.message}`);
      }
    }
    return NextResponse.json({ ok: true, checked: due.length, revoked, errors: errors.slice(0, 10) });
  } catch (e) {
    return serverError(e.message);
  }
}

export const GET = handle;
export const POST = handle;
