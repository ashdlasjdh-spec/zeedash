import { getSession } from "@/lib/session";
import { canReachGuild, isSecurityFeature, canManageFeature } from "@/lib/permissions";
import { canManageSecurity } from "@/lib/guildaccess";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FEATURE = /^[a-z0-9_-]{2,40}$/;

// Per-guild feature settings for the Server Management portal. Access is by the user's standing in THAT
// guild — Discord admin/owner, a manual ("fake") permission, or antinuke-admin — NOT the Roblox ladder.
// GET ?guild=X  -> { settings: { feature: { enabled, config } } }
//   Only the features the caller may actually manage are returned. A Discord admin sees every
//   non-security feature; a manual-permission holder sees just the ones their perms unlock; antinuke
//   admins additionally see antinuke/antiraid. Everything else is withheld (shows as OFF in the UI).
// POST { guild, feature, enabled?, config? } -> upsert one feature (gated per-feature the same way;
//   antinuke/antiraid require the guild owner or an antinuke admin — never a plain admin or manual perm).
export async function GET(req) {
  const s = await getSession();
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!s || !canReachGuild(s, guild)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!guild) return NextResponse.json({ settings: {} });
  try {
    await ensureSchema();
    const security = await canManageSecurity(s, guild); // one authoritative check, reused for both security rows
    const rows = await query("select feature, enabled, config from guild_settings where guild_id=$1", [guild]);
    const settings = {};
    for (const r of rows) {
      const allowed = isSecurityFeature(r.feature) ? security : canManageFeature(s, guild, r.feature);
      if (!allowed) continue; // don't expose config for features this user can't manage
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
  if (!s || !canReachGuild(s, guild)) return NextResponse.json({ error: "You don't manage that server." }, { status: 403 });
  if (!guild || !FEATURE.test(String(feature || ""))) return NextResponse.json({ error: "Bad guild/feature." }, { status: 400 });
  if (isSecurityFeature(feature)) {
    if (!(await canManageSecurity(s, guild))) {
      return NextResponse.json({ error: "Only the server owner or an antinuke admin can change this." }, { status: 403 });
    }
  } else if (!canManageFeature(s, guild, feature)) {
    return NextResponse.json({ error: "You don't have permission to change this feature." }, { status: 403 });
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
