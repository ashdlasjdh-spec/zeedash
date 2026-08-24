import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Recent high-signal events for the notifications bell: destructive / security actions from the audit
// log (bans, purges, blacklists, antinuke, fake-permission changes, mass group ops). Management+ only,
// same gate as the audit log. The client tracks "read" via a last-seen timestamp in localStorage.
const SIGNIFICANT = ["ban", "purge", "wipe", "blacklist", "antinuke", "antiraid", "fake-permissions", "acceptAll", "declineAll", "kickrank"];

export async function GET() {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return forbidden();
  try {
    const rows = await query(
      `select actor_name, action, category, target, detail, created_at
         from audit_log where action = any($1::text[]) order by id desc limit 20`,
      [SIGNIFICANT],
    );
    return NextResponse.json({ items: rows });
  } catch (e) {
    return serverError(e.message);
  }
}
