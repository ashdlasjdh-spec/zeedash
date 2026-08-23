import { getSession } from "@/lib/session";
import { grantsFor, canGroup } from "@/lib/permissions";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";
import { forbidden, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

// Every grant that's counting down to auto-expiry. Visible to anyone who can grant
// something (or manage the group), so they can see + manage what's pending.
export async function GET() {
  const s = await getSession();
  if (!s) return unauthorized("Not signed in");
  if (!grantsFor(s.level).length && !canGroup(s.level)) return forbidden();

  let rows = [];
  try {
    await ensureSchema();
    rows = await query("select user_id, category, item_key, expires_at, granted_by from grant_expiry order by expires_at asc limit 500");
  } catch (e) {
    return serverError(e.message);
  }

  // Best-effort username resolution (batched). Falls back to the raw id.
  const names = new Map();
  const ids = [...new Set(rows.map((r) => Number(r.user_id)).filter(Boolean))];
  for (let i = 0; i < ids.length; i += 100) {
    try {
      const r = await fetch("https://users.roblox.com/v1/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: ids.slice(i, i + 100), excludeBannedUsers: false }),
      });
      if (r.ok) { const d = await r.json(); for (const u of d.data || []) names.set(String(u.id), u.name); }
    } catch {}
  }

  const grants = rows.map((r) => ({
    userId: String(r.user_id), username: names.get(String(r.user_id)) || null,
    category: r.category, itemKey: r.item_key,
    expiresAt: r.expires_at, grantedBy: r.granted_by,
  }));
  return NextResponse.json({ grants, count: grants.length });
}
