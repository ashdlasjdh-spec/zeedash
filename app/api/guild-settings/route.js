import { getSession } from "@/lib/session";
import { canManageGuild, isSecurityFeature } from "@/lib/permissions";
import { canManageSecurity } from "@/lib/guildaccess";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FEATURE = /^[a-z0-9_-]{2,40}$/;

// Per-guild feature settings for the Server Management portal. Access is by the user's Discord
// permissions in THAT guild (admin/owner), with Roblox staff as an override — NOT the game ladder.
// GET ?guild=X  -> { settings: { feature: { enabled, config } } }
//   (security features — antinuke/antiraid — are stripped for anyone without security access)
// POST { guild, feature, enabled?, config? } -> upsert one feature
//   (security features require the guild owner / an antinuke admin / top staff)
export async function GET(req) {
  const s = await getSession();
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!s || !canManageGuild(s, guild)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!guild) return NextResponse.json({ settings: {} });
  try {
    await ensureSchema();
    const security = await canManageSecurity(s, guild);
    const rows = await query("select feature, enabled, config from guild_settings where guild_id=$1", [guild]);
    const settings = {};
    for (const r of rows) {
      if (isSecurityFeature(r.feature) && !security) continue; // don't expose antinuke/antiraid config
      settings[r.feature] = { enabled: !!r.enabled, config: r.config || {} };
    }
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const s = await getSession();
  const { guild, feature, enabled, config } = await req.json().catch(() => ({}));
  if (!s || !canManageGuild(s, guild)) return NextResponse.json({ error: "You don't manage that server." }, { status: 403 });
  if (!guild || !FEATURE.test(String(feature || ""))) return NextResponse.json({ error: "Bad guild/feature." }, { status: 400 });
  if (isSecurityFeature(feature) && !(await canManageSecurity(s, guild))) {
    return NextResponse.json({ error: "Only the server owner or an antinuke admin can change this." }, { status: 403 });
  }
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
