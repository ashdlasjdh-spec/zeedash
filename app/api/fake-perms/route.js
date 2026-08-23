import { getSession } from "@/lib/session";
import { canReachGuild } from "@/lib/permissions";
import { canManageSecurity } from "@/lib/guildaccess";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";

// Recent Fake-Permissions changes for one guild — the audit trail shown on the Fake Permissions page.
// Gated by security standing (owner / super owner / antinuke admin), the same people who may edit it,
// so it doesn't need the Roblox-level audit gate that the main /api/audit uses.
// GET ?guild=X -> { log: [{ actor_name, detail, created_at }] }
export async function GET(req) {
  const s = await getSession();
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!s || !canReachGuild(s, guild)) return forbidden();
  if (!(await canManageSecurity(s, guild))) return forbidden("Only the server owner or an antinuke admin can view this.");
  try {
    const rows = await query(
      `select actor_name, detail, created_at from audit_log
        where action = 'fake-permissions' and target = $1 order by id desc limit 25`,
      [String(guild)],
    );
    return NextResponse.json({ log: rows });
  } catch {
    return NextResponse.json({ log: [] }); // audit table may not exist yet — degrade quietly
  }
}
