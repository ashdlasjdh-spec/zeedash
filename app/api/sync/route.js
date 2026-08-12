import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { syncDbToGame } from "@/lib/sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/sync — re-hydrate the current universe from the shared Postgres DB. Co owners+.
export async function POST() {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const r = await syncDbToGame({ actorName: s.name, actorId: s.id });
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: `Sync failed: ${e?.message || String(e)}` }, { status: 500 });
  }
}
