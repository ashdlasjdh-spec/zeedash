import { NextResponse } from "next/server";
import { getLivePlayers } from "@/lib/gamestats";

export const dynamic = "force-dynamic";

// Public-info endpoint: the game's current live player count. Polled by the overview card.
export async function GET() {
  const playing = await getLivePlayers();
  return NextResponse.json({ playing }, { headers: { "cache-control": "no-store" } });
}
