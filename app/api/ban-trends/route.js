import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { getBanTrends } from "@/lib/bantrends";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Daily game-ban trend (all bans on the Roblox universe, from Open Cloud restriction logs).
export async function GET(req) {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get("days")) || 14));
  const data = await getBanTrends(days);
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
