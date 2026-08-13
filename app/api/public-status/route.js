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

  let dbOk = false, sweepAgo = null, build = null, uptimeSec = null;
  try {
    const rows = await query("select key, value from config where key in ('last_sweep_at','bot_boot_at','bot_build')");
    dbOk = true;
    const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const t = cfg.last_sweep_at ? Date.parse(cfg.last_sweep_at) : NaN;
    if (Number.isFinite(t)) sweepAgo = Math.max(0, Math.round((Date.now() - t) / 1000));
    build = cfg.bot_build || null;
    const boot = cfg.bot_boot_at ? Date.parse(cfg.bot_boot_at) : NaN;
    if (Number.isFinite(boot)) uptimeSec = Math.max(0, Math.round((Date.now() - boot) / 1000));
  } catch { /* db down */ }
  const botOnline = sweepAgo != null && sweepAgo < 90; // sweeps ~every 15s
  // Only trust build/uptime while the bot is actually beating — a stale boot time from a dead bot
  // shouldn't read as "up for 40 days".
  if (!botOnline) { build = null; uptimeSec = null; }

  let players = null, robloxOk = false;
  try { players = await getLivePlayers(); robloxOk = players != null; } catch { /* roblox down */ }

  return NextResponse.json({ botOnline, sweepAgo, dbOk, robloxOk, players, build, uptimeSec }, { headers: { "cache-control": "no-store" } });
}
