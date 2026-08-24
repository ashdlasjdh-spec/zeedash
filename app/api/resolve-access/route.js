import { getSession, resolveLevel } from "@/lib/session";
import { canReachGuild, guildAdminOf, labelForLevel } from "@/lib/permissions";
import { canManageSecurity } from "@/lib/guildaccess";
import { getGuildMemberIn } from "@/lib/discord";
import { resolveFakeForRoles, resolveGroupForRoles } from "@/lib/fakePerms";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// "What can this member do?" — resolve one Discord member's effective delegated access in a guild:
// their fake-permission buckets, the features they can manage / view-only, any Roblox group delegation,
// and their Roblox staff level. Gated to people who manage the server (Discord admin/owner) or its
// security (owner / super owner / antinuke admin) — the same folks who set these up.
// GET ?guild=X&user=<discordId> -> { member, isMember, perms, manage, view, group, level, roleName }
export async function GET(req) {
  const s = await getSession();
  const guild = req.nextUrl.searchParams.get("guild") || "";
  const user = (req.nextUrl.searchParams.get("user") || "").trim();
  if (!s || !canReachGuild(s, guild)) return forbidden();
  if (!(guildAdminOf(s, guild) || (await canManageSecurity(s, guild)))) return forbidden("You don't manage that server.");
  if (!/^\d{5,}$/.test(user)) return badRequest("Enter a valid Discord user ID.");

  try {
    const m = await getGuildMemberIn(guild, user).catch(() => null);
    if (!m) return NextResponse.json({ isMember: false });
    const roleIds = Array.isArray(m.roles) ? m.roles.map(String) : [];

    await ensureSchema();
    const rows = await query(
      "select feature, enabled, config from guild_settings where guild_id=$1 and feature in ('fake-permissions','role-access')",
      [String(guild)],
    );
    const fp = rows.find((r) => r.feature === "fake-permissions");
    const ra = rows.find((r) => r.feature === "role-access");
    const fake = fp?.enabled ? resolveFakeForRoles(fp.config || {}, roleIds) : { perms: [], manage: [], view: [] };
    const group = ra?.enabled ? resolveGroupForRoles(ra.config || {}, roleIds) : null;

    // Role-Access transcript + section grants for this member (matched by role OR by their user id).
    let transcripts = false;
    const sections = new Set();
    if (ra?.enabled) {
      for (const it of (ra.config?.items || [])) {
        const byRole = it.role && roleIds.includes(String(it.role));
        const byUser = it.user && String(it.user) === String(user);
        if (!byRole && !byUser) continue;
        if (it.transcripts) transcripts = true;
        for (const sec of (Array.isArray(it.sections) ? it.sections : [])) sections.add(sec);
      }
    }

    // Roblox staff level (game access) — best-effort; not per-guild.
    let level = 0;
    try { level = await resolveLevel(user); } catch { /* ignore */ }

    const sectionList = [...sections];
    // Would they get INTO the dashboard? (level, any group action, transcripts, a section grant, or a
    // manage/view feature grant.)
    const canAccess = level > 0 || !!(group && group.actions && group.actions.length) || transcripts || sectionList.length > 0 || fake.manage.length > 0 || fake.view.length > 0 || fake.perms.length > 0;

    const name = m.nick || m.user?.global_name || m.user?.username || null;
    return NextResponse.json({
      isMember: true,
      member: { id: user, name, avatar: m.user?.avatar || null },
      perms: fake.perms,
      manage: fake.manage,
      view: fake.view,
      group,
      transcripts,
      sections: sectionList,
      level,
      canAccess,
      roleName: labelForLevel(level),
    });
  } catch (e) {
    return serverError(e.message);
  }
}
