import { getSession } from "@/lib/session";
import { canReachGuild } from "@/lib/permissions";
import { canManageSecurity } from "@/lib/guildaccess";
import { query, ensureSchema, logAudit } from "@/lib/db";
import { normalizeItems, diffFakePerms } from "@/lib/fakePerms";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Change-control for Fake Permissions. A proposer (anyone who can reach the server) submits a full
// fake-permissions config; a security-standing user (owner / super / antinuke admin) approves — which
// applies it and audits it — or rejects it. GET lists pending proposals for approvers.

// GET ?guild=X -> { proposals: [...] } (approvers only)
export async function GET(req) {
  const s = await getSession();
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!s || !canReachGuild(s, guild)) return forbidden();
  if (!(await canManageSecurity(s, guild))) return NextResponse.json({ proposals: [] }); // non-approvers see none
  try {
    await ensureSchema();
    const rows = await query(
      "select id, proposer_id, proposer_name, config, created_at from perm_proposals where guild_id=$1 and status='pending' order by id desc limit 25",
      [guild],
    );
    return NextResponse.json({ proposals: rows });
  } catch (e) { return serverError(e.message); }
}

// POST { guild, config }                 -> submit a proposal (any user who can reach the guild)
// POST { guild, id, action: approve|reject } -> decide a proposal (approvers only)
export async function POST(req) {
  const s = await getSession();
  const body = await req.json().catch(() => ({}));
  const guild = String(body.guild || "");
  if (!s || !canReachGuild(s, guild)) return forbidden("You don't have access to that server.");

  try {
    await ensureSchema();
    // ---- decide ----
    if (body.id != null) {
      if (!(await canManageSecurity(s, guild))) return forbidden("Only the server owner or an antinuke admin can approve.");
      const action = body.action === "approve" ? "approve" : "reject";
      const rows = await query("select config from perm_proposals where id=$1 and guild_id=$2 and status='pending'", [body.id, guild]);
      if (!rows.length) return badRequest("Proposal not found or already decided.");
      if (action === "approve") {
        const items = normalizeItems(rows[0].config?.items);
        const prev = (await query("select config from guild_settings where guild_id=$1 and feature='fake-permissions'", [guild]))[0]?.config || {};
        await query(
          `insert into guild_settings (guild_id, feature, enabled, config, updated_by, updated_at)
           values ($1, 'fake-permissions', true, $2::jsonb, $3, now())
           on conflict (guild_id, feature) do update set enabled = true, config = $2::jsonb, updated_by = $3, updated_at = now()`,
          [guild, JSON.stringify({ items }), String(s.id)],
        );
        for (const line of diffFakePerms(prev, { items })) {
          logAudit({ actorId: s.id, actorName: s.name, action: "fake-permissions", category: "server", target: guild, detail: `[approved] ${line}` }).catch(() => {});
        }
      }
      await query("update perm_proposals set status=$1, decided_by=$2, decided_at=now() where id=$3", [action === "approve" ? "approved" : "rejected", String(s.id), body.id]);
      return NextResponse.json({ ok: true });
    }

    // ---- submit ----
    if (!body.config || !Array.isArray(body.config.items)) return badRequest("Missing config.");
    const items = normalizeItems(body.config.items);
    const r = await query(
      "insert into perm_proposals (guild_id, feature, config, proposer_id, proposer_name) values ($1,'fake-permissions',$2::jsonb,$3,$4) returning id",
      [guild, JSON.stringify({ items }), String(s.id), String(s.name || "")],
    );
    return NextResponse.json({ ok: true, id: r[0]?.id });
  } catch (e) { return serverError(e.message); }
}
