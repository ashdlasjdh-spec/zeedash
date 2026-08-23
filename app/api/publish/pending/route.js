import { query, ensureSchema } from "@/lib/db";
import { guardBot } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Bot-facing: claim pending publish jobs. Marks the returned rows 'working' so a second poll (or a
// second bot instance) doesn't grab the same job. The bot acks each via /api/publish/ack.
export async function GET(req) {
  const bad = guardBot(req); if (bad) return bad;
  try {
    await ensureSchema();
    // Re-arm any 'working' jobs stuck for >2 min (bot crashed mid-publish) so they retry.
    await query("update publish_queue set status='pending' where status='working' and created_at < now() - interval '2 minutes'");
    const rows = await query(
      `update publish_queue set status='working'
       where id in (select id from publish_queue where status='pending' order by created_at limit 10)
       returning id, guild_id, kind, payload`,
    );
    return NextResponse.json({ jobs: rows }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return serverError(e.message);
  }
}
