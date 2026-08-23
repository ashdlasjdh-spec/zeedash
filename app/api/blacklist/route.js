import { getSession } from "@/lib/session";
import { canWhitelist, PURGE_OWNER_IDS } from "@/lib/permissions";
import { limited } from "@/lib/ratelimit";
import { query, logAudit, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Blacklisted Discord users can't use the site at all. Co founders+ manage the list.
export async function GET() {
  const s = await getSession();
  if (!s || !canWhitelist(s.level)) return forbidden();
  try {
    await ensureSchema();
    const list = await query("select discord_id, note, added_by, added_at from blacklist order by added_at desc");
    return NextResponse.json({ list });
  } catch (e) { return serverError(e.message); }
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canWhitelist(s.level)) return forbidden();
  const capped = await limited(`blacklist:${s.id}`, { max: 20, windowSec: 60 }); if (capped) return capped;
  const { discordId, note } = await req.json();
  const id = String(discordId || "").trim();
  if (!/^\d{5,}$/.test(id)) return badRequest("Enter a valid Discord user ID.");
  if (id === String(s.id)) return badRequest("You can't blacklist yourself.");
  if (PURGE_OWNER_IDS.includes(id)) return badRequest("That owner can't be blacklisted.");
  try {
    await ensureSchema();
    await query(
      `insert into blacklist (discord_id, note, added_by) values ($1,$2,$3)
       on conflict (discord_id) do update set note = excluded.note, added_by = excluded.added_by`,
      [id, String(note || "").slice(0, 200) || null, s.id],
    );
    await logAudit({ actorId: s.id, actorName: s.name, action: "blacklist", category: "access", target: id, detail: note ? String(note).slice(0, 120) : "blocked from site" });
    return NextResponse.json({ ok: true });
  } catch (e) { return serverError(e.message); }
}

export async function DELETE(req) {
  const s = await getSession();
  if (!s || !canWhitelist(s.level)) return forbidden();
  const { discordId } = await req.json();
  const id = String(discordId || "").trim();
  if (!id) return badRequest("Missing id");
  try {
    await query("delete from blacklist where discord_id=$1", [id]);
    await logAudit({ actorId: s.id, actorName: s.name, action: "unblacklist", category: "access", target: id, detail: "restored site access" });
    return NextResponse.json({ ok: true });
  } catch (e) { return serverError(e.message); }
}
