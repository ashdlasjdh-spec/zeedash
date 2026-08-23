import { query, ensureSchema } from "@/lib/db";
import { guardBot } from "@/lib/botauth";
import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

const KIND = /^[a-z0-9_-]{2,20}$/;

// Durable bot runtime state (bump timers, VoiceMaster temp channels, starboard map). Bot-only.
// GET  ?kind=bump[&guild=][&id=]  -> { rows: [{ guild_id, kind, item_id, data, expires_at }] }
//   - no guild: every row of that kind across guilds (used to reconcile on boot)
//   - with id : the single matching row (used for starboard dedupe lookups)
// POST { guild, kind, id, data?, ttlMs? }            -> upsert one row
// POST { guild, kind, id, remove: true }             -> delete one row
export async function GET(req) {
  const bad = guardBot(req); if (bad) return bad;
  const sp = req.nextUrl.searchParams;
  const kind = sp.get("kind") || "";
  const guild = sp.get("guild") || "";
  const id = sp.get("id") || "";
  if (!KIND.test(kind)) return badRequest("Bad kind");
  try {
    await ensureSchema();
    let sql = "select guild_id, kind, item_id, data, expires_at from bot_state where kind = $1";
    const params = [kind];
    if (guild) { params.push(guild); sql += ` and guild_id = $${params.length}`; }
    if (id) { params.push(id); sql += ` and item_id = $${params.length}`; }
    sql += " order by updated_at desc limit 5000";
    const rows = await query(sql, params);
    return NextResponse.json({ rows }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return serverError(e.message);
  }
}

export async function POST(req) {
  const bad = guardBot(req); if (bad) return bad;
  const { guild, kind, id, data, ttlMs, remove } = await req.json().catch(() => ({}));
  if (!guild || !KIND.test(String(kind || "")) || !id) return badRequest();
  try {
    await ensureSchema();
    if (remove) {
      await query("delete from bot_state where guild_id=$1 and kind=$2 and item_id=$3", [String(guild), String(kind), String(id)]);
      return NextResponse.json({ ok: true, removed: true });
    }
    const expires = Number(ttlMs) > 0 ? new Date(Date.now() + Number(ttlMs)).toISOString() : null;
    await query(
      `insert into bot_state (guild_id, kind, item_id, data, expires_at, updated_at)
       values ($1, $2, $3, coalesce($4::jsonb, '{}'::jsonb), $5, now())
       on conflict (guild_id, kind, item_id) do update set
         data = coalesce($4::jsonb, bot_state.data), expires_at = $5, updated_at = now()`,
      [String(guild), String(kind), String(id), data == null ? null : JSON.stringify(data), expires],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e.message);
  }
}
