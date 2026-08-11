import { NextResponse } from "next/server";
import { CATALOG } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// The grantable-item catalog, for the Discord bot to build its /grant autocomplete. CRON_SECRET-gated
// (same secret the bot already uses); the data isn't sensitive but we keep the surface consistent.
export async function GET(req) {
  const auth = req.headers.get("authorization") || "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ catalog: CATALOG }, { headers: { "cache-control": "no-store" } });
}
