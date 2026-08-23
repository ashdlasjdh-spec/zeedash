import { getSession } from "@/lib/session";
import { canReachGuild } from "@/lib/permissions";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Outcome of the most recent publish for a guild+kind, so the Message Builder (and other Publish
// buttons) can show whether the bot actually posted it — "posted in #x", the failure reason, or that
// it's still waiting — instead of a permanent "Queued". Session-gated to someone who can reach the guild.
export async function GET(req) {
  const s = await getSession();
  const guild = req.nextUrl.searchParams.get("guild") || "";
  const kind = req.nextUrl.searchParams.get("kind") || "";
  if (!s || !canReachGuild(s, guild)) return forbidden();
  if (!/^[a-z]{2,20}$/.test(kind)) return badRequest("Bad kind");
  try {
    await ensureSchema();
    const rows = await query(
      "select status, result, created_at, done_at from publish_queue where guild_id=$1 and kind=$2 order by id desc limit 1",
      [String(guild), String(kind)],
    );
    const r = rows[0];
    return NextResponse.json(
      r ? { status: r.status, result: r.result || null, at: r.created_at, done: r.done_at || null } : { status: null },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return serverError(e.message);
  }
}
