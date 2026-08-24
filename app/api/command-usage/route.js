import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Command-usage analytics (management+ only, like the audit log). ?days=N window (default 30).
// Returns { total, days, byCommand: [{command,count}], byUser: [{actor_id,actor_name,count}],
//           byDay: [{day,count}] }.
export async function GET(req) {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return forbidden();
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const since = `now() - interval '${days} days'`;
  try {
    const [byCommand, byUser, byDay, totalRows] = await Promise.all([
      query(`select command, count(*)::int count from command_usage where at >= ${since} group by command order by count desc limit 30`),
      query(`select actor_id, max(actor_name) actor_name, count(*)::int count from command_usage where at >= ${since} and actor_id is not null group by actor_id order by count desc limit 20`),
      query(`select to_char(date_trunc('day', at), 'YYYY-MM-DD') day, count(*)::int count from command_usage where at >= ${since} group by 1 order by 1`),
      query(`select count(*)::int total from command_usage where at >= ${since}`),
    ]);
    return NextResponse.json({ total: totalRows[0]?.total || 0, days, byCommand, byUser, byDay });
  } catch (e) {
    return serverError(e.message);
  }
}
