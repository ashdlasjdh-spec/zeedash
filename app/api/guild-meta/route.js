import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { getGuildMeta } from "@/lib/discord";
import { NextResponse } from "next/server";
import { forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";

// The guild's channels (text / voice / categories) + roles — for the dashboard's dropdown pickers.
export async function GET(req) {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return forbidden();
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!guild) return NextResponse.json({ text: [], voice: [], categories: [], roles: [] });
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  const r = await getGuildMeta(guild, fresh);
  if (r.error) return NextResponse.json({ error: r.error, text: [], voice: [], categories: [], roles: [] }, { status: r.status || 500 });
  return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
}
