import { query } from "@/lib/db";
import { getLivePlayers } from "@/lib/gamestats";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public, NON-sensitive health snapshot for the /status page (no auth, rate-limited). Only booleans +
// a live player count — nothing internal. Bot liveness comes from the sweep heartbeat the bot writes
// (last_sweep_at) every ~15s.
export async function GET(req) {
  const rl = await rateLimit(`status:${clientIp(req)}`, { max: 60, windowSec: 60 });
  if (!rl.ok) return NextResponse.json({ error: "busy" }, { status: 429, headers: { "retry-after": "20" } });

  let dbOk = false, sweepAgo = null;
  try {
    const rows = await query("select value from config where key = 'last_sweep_at'");
    dbOk = true;
    const t = rows[0]?.value ? Date.parse(rows[0].value) : NaN;
    if (Number.isFinite(t)) sweepAgo = Math.max(0, Math.round((Date.now() - t) / 1000));
  } catch { /* db down */ }
  const botOnline = sweepAgo != null && sweepAgo < 90; // sweeps ~every 15s

  let players = null, robloxOk = false;
  try { players = await getLivePlayers(); robloxOk = players != null; } catch { /* roblox down */ }

  return NextResponse.json({ botOnline, sweepAgo, dbOk, robloxOk, players }, { headers: { "cache-control": "no-store" } });
}
