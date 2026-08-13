import { getGameServers } from "@/lib/gamestats";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public: live list of the game's public servers (player counts + avg ping + FPS). Cached upstream,
// rate-limited here. No region — Roblox doesn't expose it.
export async function GET(req) {
  const rl = await rateLimit(`gsrv:${clientIp(req)}`, { max: 60, windowSec: 60 });
  if (!rl.ok) return NextResponse.json({ servers: [] }, { status: 429, headers: { "retry-after": "15" } });
  const servers = await getGameServers();
  const players = servers.reduce((n, s) => n + (s.playing || 0), 0);
  return NextResponse.json({ servers, count: servers.length, players }, { headers: { "cache-control": "no-store" } });
}
