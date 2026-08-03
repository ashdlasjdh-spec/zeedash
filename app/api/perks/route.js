import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { listPerks } from "@/lib/perksApi";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET — every player who has perks in the shared DB (gamepasses/powers/tools/armor).
// This is the "Currently granted" data on the grant pages, so require a grant-capable
// rank (staff advisor+, 247) — not just any signed-in user.
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(s.level, "power")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { perks } = await listPerks();
    return NextResponse.json({ perks: perks || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
