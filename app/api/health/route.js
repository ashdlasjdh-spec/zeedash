import { NextResponse } from "next/server";
import { forbidden } from "@/lib/api";
import { query } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { botAuthed } from "@/lib/botauth";

export const dynamic = "force-dynamic";

// Health probe (CRON_SECRET). Checks the DB and Roblox Open Cloud so the bot's /status can report
// what's up/down. Kept behind the secret so infra status isn't public.
export async function GET(req) {
  if (!botAuthed(req)) {
    return forbidden();
  }
  const out = { db: false, openCloud: false };
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
  return NextResponse.json({ ok: out.db && out.openCloud, ...out, at: new Date().toISOString() });
}
