import { getSession } from "@/lib/session";
import { listPerks } from "@/lib/perksApi";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET — every player who has perks in the shared DB (gamepasses/powers/tools/armor).
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const { perks } = await listPerks();
    return NextResponse.json({ perks: perks || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
