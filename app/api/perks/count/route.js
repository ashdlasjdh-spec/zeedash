import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

// perks-table column per grant category. Fixed whitelist — never user input — so it's safe
// to interpolate the column name (Postgres can't parameterize identifiers).
const COL = { power: "powers", gamepass: "gamepasses", tool: "tools", shazam: "shazam", startbr: "startbr", stand: "stand", car: "car" };

// GET /api/perks/count?category=power -> { players, total } for that category.
// Cheap single COUNT/SUM over the perks table (no row payload), gated to whoever can grant it.
export async function GET(req) {
  const s = await getSession();
  if (!s) return unauthorized("Not signed in");
  const category = req.nextUrl.searchParams.get("category") || "";
  const col = COL[category];
  if (!col) return badRequest("Unknown category");
  if (!can(s.level, category)) return forbidden();
  try {
    const r = await query(
      `select count(*) filter (where coalesce(array_length(${col}, 1), 0) > 0)::int players,
              coalesce(sum(coalesce(array_length(${col}, 1), 0)), 0)::int total
       from perks`,
    );
    return NextResponse.json({ players: r[0]?.players || 0, total: r[0]?.total || 0 });
  } catch (e) {
    return serverError(e.message);
  }
}
