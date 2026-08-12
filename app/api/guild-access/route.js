import { getSession } from "@/lib/session";
import { guildAccess } from "@/lib/guildaccess";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// What can the signed-in user do in this guild's Server Management? { manage, security, owner }.
// Drives the sidebar (hide Security when !security) and per-page gating.
export async function GET(req) {
  const s = await getSession();
  if (!s) return NextResponse.json({ manage: false, security: false, owner: false }, { status: 401 });
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!guild) return NextResponse.json({ manage: false, security: false, owner: false });
  const access = await guildAccess(s, guild);
  return NextResponse.json(access, { headers: { "cache-control": "no-store" } });
}
