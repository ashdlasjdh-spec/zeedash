import { getSession } from "@/lib/session";
import { canManageGrants } from "@/lib/permissions";
import { listPerks } from "@/lib/perksApi";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET — every player who has perks in the shared DB (gamepasses/powers/tools/shazam).
// This is the "Currently granted" list used to remove other people's grants, so it's
// co founders+ (254) only — lower grant ranks (247+) can still add/revoke by name.
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canManageGrants(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { perks } = await listPerks();
    return NextResponse.json({ perks: perks || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
