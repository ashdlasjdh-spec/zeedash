import { getSession } from "@/lib/session";
import { canWhitelist, ROLES, rank } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getSession();
  if (!s || !canWhitelist(s.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await query("select discord_id, role, note, added_by, added_at from whitelist order by added_at desc");
  return NextResponse.json({ list: rows });
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canWhitelist(s.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { discordId, role, note } = await req.json();
  if (!discordId || !ROLES.includes(role)) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  // can't assign a role above your own
  if (rank(role) > rank(s.role)) return NextResponse.json({ error: "Can't assign a role above yours" }, { status: 403 });
  await query(
    `insert into whitelist (discord_id, role, note, added_by) values ($1,$2,$3,$4)
     on conflict (discord_id) do update set role=$2, note=$3, added_by=$4`,
    [discordId, role, note || null, s.name]
  );
  await query(`insert into audit_log (actor_id, actor_name, action, target, detail) values ($1,$2,'whitelist',$3,$4)`,
    [s.id, s.name, discordId, `set role ${role}`]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const s = await getSession();
  if (!s || !canWhitelist(s.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { discordId } = await req.json();
  await query("delete from whitelist where discord_id=$1", [discordId]);
  return NextResponse.json({ ok: true });
}
