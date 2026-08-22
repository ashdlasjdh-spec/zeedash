import { getSession } from "@/lib/session";
import { canWhitelistS, RANKS, labelForLevel } from "@/lib/permissions";
import { query, logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getSession();
  if (!s || !canWhitelistS(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await query("select discord_id, role, note, added_by, added_at from whitelist order by added_at desc");
  // `role` stores the numeric level; surface a friendly label too.
  return NextResponse.json({ list: rows.map((r) => ({ ...r, level: Number(r.role) || 0, roleLabel: labelForLevel(r.role) })) });
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canWhitelistS(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { discordId, level, note } = await req.json();
  const lvl = Number(level);
  if (!discordId || !RANKS.some((r) => r.level === lvl)) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  // can't grant a level above your own
  if (lvl > Number(s.level)) return NextResponse.json({ error: "Can't assign a level above yours" }, { status: 403 });
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
  if (!s || !canWhitelistS(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { discordId } = await req.json();
  await query("delete from whitelist where discord_id=$1", [discordId]);
  await logAudit({ actorId: s.id, actorName: s.name, action: "whitelist", target: discordId, detail: "removed from whitelist" });
  return NextResponse.json({ ok: true });
}
