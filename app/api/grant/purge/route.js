import { getSession } from "@/lib/session";
import { canPurge } from "@/lib/permissions";
import { applyGrant, PERK_FIELD } from "@/lib/grantEngine";
import { listPerks } from "@/lib/perksApi";
import { logAudit, query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const buildWarn = (warns, errors) =>
  [
    warns ? `${warns} shared-DB sync warning(s)` : null,
    errors.length ? `${errors.length} item(s) failed: ${errors.slice(0, 5).join("; ")}${errors.length > 5 ? "…" : ""}` : null,
  ].filter(Boolean).join(" · ") || null;

// POST — two destructive modes, both locked to the named owner Discord IDs (canPurge):
//   { category }         -> remove EVERY grant in one section from EVERY player who has it.
//   { granter }          -> revoke EVERYTHING a specific staff member ever granted (found via
//                           the audit log by their Discord id or name). Use this to undo a
//                           dashboard abuser — pulls back every power/tool/gamepass/etc they gave.
export async function POST(req) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canPurge(s.id)) return NextResponse.json({ error: "Only owners can remove all." }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  // ---- Mode 2: undo everything a specific granter handed out ----
  if (body.granter != null) {
    const g = String(body.granter).trim();
    if (!g) return NextResponse.json({ error: "Enter the granter's Discord ID or name." }, { status: 400 });
    try {
      // Every grant that staff member logged (by id OR name), across all perk sections.
      const rows = await query(
        `select category, item_key, target from audit_log
           where action = 'grant' and category = ANY($1)
             and (actor_id = $2 or lower(actor_name) = lower($2))
           order by created_at desc`,
        [Object.keys(PERK_FIELD), g],
      );

      const seen = new Set(); // dedupe (category+item+user) so we revoke each once
      const users = new Set();
      let items = 0, warns = 0;
      const errors = [];
      for (const r of rows) {
        const uid = (String(r.target).match(/\((\d+)\)/) || [])[1];
        if (!uid || !r.item_key || !PERK_FIELD[r.category]) continue;
        const sig = `${r.category}:${r.item_key}:${uid}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        try {
          const { warn } = await applyGrant({ category: r.category, key: r.item_key, uid, by: s.name, byId: s.id, action: "revoke" });
          if (warn) warns++;
          items++; users.add(uid);
        } catch (e) {
          errors.push(`${uid}/${r.item_key}: ${e.message}`);
        }
      }

      await logAudit({
        actorId: s.id, actorName: s.name, action: "purge", category: "granter", itemKey: g,
        target: `revoked ${items} grant(s) made by ${g} across ${users.size} player(s)`,
      });
      return NextResponse.json({ ok: !errors.length, removed: { users: users.size, items }, warn: buildWarn(warns, errors), byGranter: g });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // ---- Mode 1: mass-remove one whole section ----
  const { category } = body;
  const field = PERK_FIELD[category];
  if (!field) return NextResponse.json({ error: "Category can't be mass-removed." }, { status: 400 });

  try {
    const { perks } = await listPerks();
    const rows = (perks || [])
      .map((p) => ({ userId: p.userId, items: Array.isArray(p[field]) ? p[field] : [] }))
      .filter((r) => r.userId && r.items.length);

    let users = 0, items = 0, warns = 0;
    const errors = [];
    for (const r of rows) {
      let removedForUser = 0;
      for (const key of r.items) {
        try {
          const { warn } = await applyGrant({ category, key, uid: r.userId, by: s.name, byId: s.id, action: "revoke" });
          if (warn) warns++;
          items++; removedForUser++;
        } catch (e) {
          errors.push(`${r.userId}/${key}: ${e.message}`);
        }
      }
      if (removedForUser) users++;
    }

    await logAudit({
      actorId: s.id, actorName: s.name, action: "purge", category, itemKey: "*",
      target: `mass remove — ${items} ${category}(s) from ${users} user(s)`,
    });
    return NextResponse.json({ ok: !errors.length, removed: { users, items }, warn: buildWarn(warns, errors) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
