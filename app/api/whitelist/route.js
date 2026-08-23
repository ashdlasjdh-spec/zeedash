import { getSession } from "@/lib/session";
import { canWhitelistS, RANKS, labelForLevel } from "@/lib/permissions";
import { query, logAudit } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden } from "@/lib/api";

export async function GET() {
  const s = await getSession();
  if (!s || !canWhitelistS(s)) return forbidden();
  const rows = await query("select discord_id, role, note, added_by, added_at from whitelist order by added_at desc");
  // `role` stores the numeric level; surface a friendly label too.
  return NextResponse.json({ list: rows.map((r) => ({ ...r, level: Number(r.role) || 0, roleLabel: labelForLevel(r.role) })) });
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canWhitelistS(s)) return forbidden();
  const { discordId, level, note } = await req.json();
  const lvl = Number(level);
  if (!discordId || !RANKS.some((r) => r.level === lvl)) return badRequest("Bad input");
  // can't grant a level above your own
  if (lvl > Number(s.level)) return forbidden("Can't assign a level above yours");
  await query(
    `insert into whitelist (discord_id, role, note, added_by) values ($1,$2,$3,$4)
     on conflict (discord_id) do update set role=$2, note=$3, added_by=$4`,
    [discordId, String(lvl), note || null, s.name]
  );
  await logAudit({ actorId: s.id, actorName: s.name, action: "whitelist", target: discordId, detail: `set ${labelForLevel(lvl)} (lvl ${lvl})` });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const s = await getSession();
  if (!s || !canWhitelistS(s)) return forbidden();
  const { discordId } = await req.json();
  await query("delete from whitelist where discord_id=$1", [discordId]);
  await logAudit({ actorId: s.id, actorName: s.name, action: "whitelist", target: discordId, detail: "removed from whitelist" });
  return NextResponse.json({ ok: true });
}
