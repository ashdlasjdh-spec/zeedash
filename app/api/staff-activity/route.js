import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Staff activity leaderboard (management+ only). Combines moderation/grant actions from the audit log
// with bot command usage, per staff member, over a window. ?days=N (default 30).
export async function GET(req) {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return forbidden();
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const since = `now() - interval '${days} days'`;
  try {
    const [actions, commands] = await Promise.all([
      query(`select actor_id, max(actor_name) actor_name, count(*)::int actions
               from audit_log where created_at >= ${since} and actor_id is not null
              group by actor_id`),
      query(`select actor_id, max(actor_name) actor_name, count(*)::int commands
               from command_usage where at >= ${since} and actor_id is not null
              group by actor_id`),
    ]);
    // Merge the two sources by actor.
    const byId = new Map();
    const bump = (id, name, k, v) => {
      const r = byId.get(id) || { actor_id: id, actor_name: name, actions: 0, commands: 0 };
      if (name) r.actor_name = name;
      r[k] += v;
      byId.set(id, r);
    };
    for (const r of actions) bump(r.actor_id, r.actor_name, "actions", r.actions);
    for (const r of commands) bump(r.actor_id, r.actor_name, "commands", r.commands);
    const rows = [...byId.values()].map((r) => ({ ...r, total: r.actions + r.commands })).sort((a, b) => b.total - a.total).slice(0, 25);
    return NextResponse.json({ days, staff: rows });
  } catch (e) {
    return serverError(e.message);
  }
}
