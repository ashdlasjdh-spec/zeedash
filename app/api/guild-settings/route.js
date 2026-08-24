import { getSession, bumpGrantsVersion } from "@/lib/session";
import { canReachGuild, isSecurityFeature, canManageFeature, canViewFeature, isFeatureReadOnly, grantChannelsFor } from "@/lib/permissions";
import { canManageSecurity } from "@/lib/guildaccess";
import { logAudit } from "@/lib/db";
import { diffFakePerms, normalizeItems } from "@/lib/fakePerms";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

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
  if (!s || !canReachGuild(s, guild)) return forbidden();
  if (!guild) return NextResponse.json({ settings: {} });
  try {
    await ensureSchema();
    const security = await canManageSecurity(s, guild); // one authoritative check, reused for both security rows + fake-permissions
    const rows = await query("select feature, enabled, config from guild_settings where guild_id=$1", [guild]);
    const settings = {};
    for (const r of rows) {
      // Security features AND fake-permissions gate on security standing (owner / super / antinuke admin).
      const secGated = isSecurityFeature(r.feature) || r.feature === "fake-permissions";
      // A view-only feature grant may SEE (read-only) a feature it can't manage.
      const allowed = secGated ? security : canViewFeature(s, guild, r.feature);
      if (!allowed) continue; // don't expose config for features this user can't even view
      const readOnly = !secGated && isFeatureReadOnly(s, guild, r.feature);
      const channels = secGated ? [] : grantChannelsFor(s, guild, r.feature);
      settings[r.feature] = { enabled: !!r.enabled, config: r.config || {}, readOnly, channels };
    }
    return NextResponse.json({ settings });
  } catch (e) {
    return serverError(e.message);
  }
}

export async function POST(req) {
  const s = await getSession();
  const { guild, feature, enabled, config } = await req.json().catch(() => ({}));
  if (!s || !canReachGuild(s, guild)) return forbidden("You don't manage that server.");
  if (!guild || !FEATURE.test(String(feature || ""))) return badRequest("Bad guild/feature.");
  // Security features and fake-permissions both require security standing (owner / super / antinuke admin).
  if (isSecurityFeature(feature) || feature === "fake-permissions") {
    if (!(await canManageSecurity(s, guild))) {
      return forbidden("Only the server owner or an antinuke admin can change this.");
    }
  } else if (!canManageFeature(s, guild, feature)) {
    return forbidden("You don't have permission to change this feature.");
  }
  // Sanitize the fake-permissions payload server-side (strip junk / non-grantable features / dup roles).
  let outConfig = config;
  if (feature === "fake-permissions" && config != null) outConfig = { ...config, items: normalizeItems(config.items) };
  const en = typeof enabled === "boolean" ? enabled : null;
  const cfg = outConfig == null ? null : JSON.stringify(outConfig);
  try {
    await ensureSchema();
    // For fake-permissions, read the prior config first so we can audit exactly what changed per role.
    let prevConfig = null;
    if (feature === "fake-permissions" && config != null) {
      const before = await query("select config from guild_settings where guild_id=$1 and feature=$2", [String(guild), String(feature)]);
      prevConfig = before[0]?.config || {};
    }
    await query(
      `insert into guild_settings (guild_id, feature, enabled, config, updated_by, updated_at)
       values ($1, $2, coalesce($3, false), coalesce($4::jsonb, '{}'::jsonb), $5, now())
       on conflict (guild_id, feature) do update set
         enabled = coalesce($3, guild_settings.enabled),
         config = coalesce($4::jsonb, guild_settings.config),
         updated_by = $5, updated_at = now()`,
      [String(guild), String(feature), en, cfg, s.id],
    );
    // Audit fake-permissions edits — who granted/revoked which perms & features on which role.
    if (feature === "fake-permissions" && config != null) {
      for (const line of diffFakePerms(prevConfig, outConfig)) {
        logAudit({ actorId: s.id, actorName: s.name, action: "fake-permissions", category: "server", target: guild, detail: line }).catch(() => {});
      }
    }
    // Any change that affects delegated access (fake-permissions, antinuke admins) should apply
    // immediately — bust the grants cache so affected users see it on their next page load.
    if (feature === "fake-permissions" || feature === "antinuke") { await bumpGrantsVersion(); }
    const rows = await query("select enabled, config from guild_settings where guild_id=$1 and feature=$2", [String(guild), String(feature)]);
    return NextResponse.json({ ok: true, enabled: !!rows[0]?.enabled, config: rows[0]?.config || {} });
  } catch (e) {
    return serverError(e.message);
  }
}
