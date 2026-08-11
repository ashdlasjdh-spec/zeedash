import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Live health for the Overview badges. Reads heartbeat markers written by the sweep
// (last_sweep_at — the bot pings it every ~15s) and the ban scan (bans_count / bans_scanned_at).
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const cfg = {};
  try {
    const rows = await query("select key, value from config where key in ('last_sweep_at','bans_count','bans_scanned_at')");
    for (const r of rows) cfg[r.key] = r.value;
  } catch {}

  const ageSec = (iso) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? Math.max(0, Math.round((Date.now() - t) / 1000)) : null; };
  const sweepAgo = ageSec(cfg.last_sweep_at);
  const botOnline = sweepAgo != null && sweepAgo < 90; // bot sweeps every ~15s; 90s = a few missed ticks

  return NextResponse.json({
    botOnline,
    sweepAgo,
    bansCount: cfg.bans_count != null ? Number(cfg.bans_count) : null,
    bansAgo: ageSec(cfg.bans_scanned_at),
  });
}
