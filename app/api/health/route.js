import { NextResponse } from "next/server";
import { forbidden } from "@/lib/api";
import { query } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { botAuthed } from "@/lib/botauth";
import { kvEnabled, kvGetJSON } from "@/lib/kv";

export const dynamic = "force-dynamic";

// Health probe (CRON_SECRET). Checks the DB, Roblox Open Cloud, Redis (if configured), and whether a
// Discord bot token is present, so the bot's /status can report what's up/down. Kept behind the secret.
export async function GET(req) {
  if (!botAuthed(req)) {
    return forbidden();
  }
  const out = { db: false, openCloud: false, redis: null, discordToken: !!process.env.DISCORD_BOT_TOKEN };
  try { await query("select 1"); out.db = true; } catch {}
  try {
    const c = await getConfig();
    if (c.apiKey && c.universeId) {
      const r = await fetch(`https://apis.roblox.com/datastores/v1/universes/${c.universeId}/standard-datastores`, {
        headers: { "x-api-key": c.apiKey }, cache: "no-store", signal: AbortSignal.timeout(6000),
      });
      out.openCloud = r.ok; // 200 = key valid + datastore access
    }
  } catch {}
  // Redis: null = not configured (fine); true/false = configured and reachable / not.
  if (kvEnabled) { try { await kvGetJSON("health:ping"); out.redis = true; } catch { out.redis = false; } }
  // "ok" = the hard dependencies are up (Redis is optional; a missing Discord token is a warning).
  const ok = out.db && out.openCloud && out.redis !== false;
  return NextResponse.json({ ok, ...out, at: new Date().toISOString() });
}
