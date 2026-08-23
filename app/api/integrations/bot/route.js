import { guardBot } from "@/lib/botauth";
import { getIntegrations } from "@/lib/config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Bot-facing: the resolved integration values keyed by env-var name (dashboard override, else the
// dashboard host's own env). CRON_SECRET-guarded — never exposed to the browser. The bot polls this
// (cached ~60s) and uses a value if present, else its own process.env.
export async function GET(req) {
  const bad = guardBot(req);
  if (bad) return bad;
  // Only values actually set in the dashboard DB — the bot falls back to its OWN process.env for the
  // rest (the dashboard host's env is irrelevant to the bot), so don't leak env-sourced values here.
  const { values, sources } = await getIntegrations();
  const out = {};
  for (const [env, v] of Object.entries(values)) if (sources[env] === "dashboard") out[env] = v;
  return NextResponse.json({ values: out }, { headers: { "cache-control": "no-store" } });
}
