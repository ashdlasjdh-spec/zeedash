import { getSession } from "@/lib/session";
import { canGroup, canConfig } from "@/lib/permissions";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FEATURE = /^[a-z0-9_-]{2,40}$/;

// Per-guild feature settings for the Server Management portal.
// GET ?guild=X  -> { settings: { feature: { enabled, config } } }   (Management+)
// POST { guild, feature, enabled?, config? } -> upsert one feature   (co owners+)
export async function GET(req) {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!guild) return NextResponse.json({ settings: {} });
  try {
    await ensureSchema();
    const rows = await query("select feature, enabled, config from guild_settings where guild_id=$1", [guild]);
    const settings = {};
    for (const r of rows) settings[r.feature] = { enabled: !!r.enabled, config: r.config || {} };
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return NextResponse.json({ error: "Co owners+ only." }, { status: 403 });
  const { guild, feature, enabled, config } = await req.json().catch(() => ({}));
  if (!guild || !FEATURE.test(String(feature || ""))) return NextResponse.json({ error: "Bad guild/feature." }, { status: 400 });
  const en = typeof enabled === "boolean" ? enabled : null;
  const cfg = config == null ? null : JSON.stringify(config);
  try {
    await ensureSchema();
    await query(
      `insert into guild_settings (guild_id, feature, enabled, config, updated_by, updated_at)
       values ($1, $2, coalesce($3, false), coalesce($4::jsonb, '{}'::jsonb), $5, now())
       on conflict (guild_id, feature) do update set
         enabled = coalesce($3, guild_settings.enabled),
         config = coalesce($4::jsonb, guild_settings.config),
         updated_by = $5, updated_at = now()`,
      [String(guild), String(feature), en, cfg, s.id],
    );
    const rows = await query("select enabled, config from guild_settings where guild_id=$1 and feature=$2", [String(guild), String(feature)]);
    return NextResponse.json({ ok: true, enabled: !!rows[0]?.enabled, config: rows[0]?.config || {} });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
