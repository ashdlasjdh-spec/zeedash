import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await query("select actor_name, action, category, item_key, target, created_at from audit_log order by id desc limit 50");
  return NextResponse.json({ log: rows });
}
