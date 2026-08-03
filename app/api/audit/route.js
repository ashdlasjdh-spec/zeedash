import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The action log is oversight data (who granted/ranked/kicked what). Management+
// (level 242+) only — regular staff can't read it.
export async function GET() {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await query("select actor_name, action, category, item_key, target, created_at from audit_log order by id desc limit 50");
  return NextResponse.json({ log: rows });
}
