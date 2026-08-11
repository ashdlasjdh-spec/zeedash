import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The action log is oversight data (who granted/ranked/kicked/banned what). Management+
// (level 242+) only — regular staff can't read it. Supports filtering + paging so it can back
// both the Overview snapshot (no params) and the full Audit Log page.
export async function GET(req) {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const actor = (sp.get("actor") || "").trim();
  const action = (sp.get("action") || "").trim();
  const category = (sp.get("category") || "").trim();
  const q = (sp.get("q") || "").trim();
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));
  const offset = Math.max(0, Number(sp.get("offset")) || 0);

  const where = [];
  const params = [];
  if (actor) {
    params.push(actor, `%${actor}%`);
    where.push(`(actor_id = $${params.length - 1} or actor_name ilike $${params.length})`);
  }
  if (action) { params.push(action); where.push(`action = $${params.length}`); }
  if (category) { params.push(category); where.push(`category = $${params.length}`); }
  if (q) { params.push(`%${q}%`); where.push(`(target ilike $${params.length} or item_key ilike $${params.length} or detail ilike $${params.length})`); }
  const wsql = where.length ? `where ${where.join(" and ")}` : "";

  params.push(limit); const lim = params.length;
  params.push(offset); const off = params.length;
  try {
    const rows = await query(
      `select actor_id, actor_name, action, category, item_key, target, detail, created_at
         from audit_log ${wsql} order by id desc limit $${lim} offset $${off}`,
      params,
    );
    return NextResponse.json({ log: rows });
  } catch (e) {
    console.error("[audit]", e.message);
    return NextResponse.json({ error: "Could not read the audit log." }, { status: 500 });
  }
}
