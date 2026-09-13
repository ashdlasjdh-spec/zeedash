import { NextResponse } from "next/server";
import { forbidden } from "@/lib/api";
import { CATALOG } from "@/lib/catalog";
import { botAuthed } from "@/lib/botauth";

export const dynamic = "force-dynamic";

// The grantable-item catalog, for the Discord bot to build its /grant autocomplete. CRON_SECRET-gated
// (same secret the bot already uses); the data isn't sensitive but we keep the surface consistent.
export async function GET(req) {
  if (!botAuthed(req)) {
    return forbidden();
  }
  // CATALOG is a build-time constant (only changes on deploy, which busts the CDN cache), so cache it
  // hard at the edge instead of recomputing + re-sending it on every request.
  return NextResponse.json({ catalog: CATALOG }, { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
