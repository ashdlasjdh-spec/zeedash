import { getSession, bumpGrantsVersion } from "@/lib/session";
import { isSuperOwner, GROUP_ACTIONS, RANK_ASSIGN_ACTIONS, SECTION_GRANTS } from "@/lib/permissions";
import { getGuildMeta } from "@/lib/discord";
import { getConfig } from "@/lib/config";
import { listGroupRoles } from "@/lib/robloxGroups";
import { query, ensureSchema, logAudit } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Super-owner-only: delegate Roblox GROUP management to a Discord role in one of the community servers.
// This is its OWN feature ("role-access") — separate from fake-permissions (Server-portal features).
// Per role we store WHICH group actions the role may run and the HIGHEST group rank it may assign /
// accept people to. Members holding a mapped role get that group access on the site automatically
// (resolved in getSession as session.group). Granting/crew-tags/bans were removed — those moved sites.
const SITE_ROLE_GUILDS = [
  "1447037325380157452",
  "1496219608800170004",
  "1494327144829026354",
  "1531917648588312677",
];
const GUILD_LABELS = {
  "1447037325380157452": "ZHD",
  "1496219608800170004": "ZHD Board",
  "1494327144829026354": "ZHD HOF",
  "1531917648588312677": "Server",
};

async function guard() {
  const s = await getSession();
  if (!s || !isSuperOwner(s.id)) return { error: forbidden() };
  return { session: s };
}

// Sanitize one stored/posted item into { role?, user?, group: { actions, maxRank }, transcripts, sections }
// or null. An item targets EITHER a Discord role OR a specific user id (so access can be granted to a
// user even when they don't have the role).
function cleanItem(it) {
  const role = String(it?.role || "").match(/^\d{5,}$/)?.[0] || null;
  const user = String(it?.user || "").match(/^\d{5,}$/)?.[0] || null;
  if (!role && !user) return null; // must target someone
  const g = it?.group || {};
  const actions = [...new Set((Array.isArray(g.actions) ? g.actions : []).map(String).filter((a) => GROUP_ACTIONS.includes(a)))];
  const transcripts = !!it?.transcripts; // may view ticket transcripts for this server
  const sections = [...new Set((Array.isArray(it?.sections) ? it.sections : []).map(String).filter((s) => SECTION_GRANTS.includes(s)))];
  if (!actions.length && !transcripts && !sections.length) return null; // grants nothing
  // A ceiling only matters when the role can lift people up; store it as a plain rank number.
  const needsCeiling = actions.some((a) => RANK_ASSIGN_ACTIONS.has(a));
  const mr = Number(g.maxRank);
  const maxRank = needsCeiling && Number.isFinite(mr) ? Math.max(0, Math.min(255, Math.floor(mr))) : null;
  const out = { group: { actions, maxRank }, transcripts, sections };
  if (role) out.role = role;
  if (user) out.user = user;
  return out;
}

// GET            -> { guilds: [{ id, name, icon }] }
// GET ?guild=X   -> { roles: [{id,name}], groupRanks: [{rank,name}], items: [{ role, group }] }
export async function GET(req) {
  const g = await guard();
  if (g.error) return g.error;
  const guild = req.nextUrl.searchParams.get("guild") || "";

  try {
    await ensureSchema();
    if (!guild) {
      const rows = await query(
        "select guild_id, max(guild_name) name, max(guild_icon) icon from server_stats where guild_id = any($1::text[]) group by guild_id",
        [SITE_ROLE_GUILDS],
      ).catch(() => []);
      const byId = new Map(rows.map((r) => [r.guild_id, r]));
      const guilds = SITE_ROLE_GUILDS.map((id) => {
        const r = byId.get(id);
        return {
          id,
          name: r?.name || GUILD_LABELS[id] || id,
          icon: r?.icon ? `https://cdn.discordapp.com/icons/${id}/${r.icon}.png?size=64` : null,
        };
      });
      return NextResponse.json({ guilds });
    }

    if (!SITE_ROLE_GUILDS.includes(guild)) return badRequest("That server isn't managed here.");
    // Load the guild's live roles for the picker. A FAILURE HERE MUST NOT HIDE SAVED MAPPINGS — if the
    // bot can't read this guild's roles (not in it, 403, rate-limited), we still return everything that's
    // saved so nothing "disappears" on refresh; the picker just can't offer role NAMES until it recovers.
    const meta = await getGuildMeta(guild);
    const rolesOk = !meta?.error && Array.isArray(meta?.roles);
    const roles = rolesOk ? meta.roles : [];
    const liveRoleIds = rolesOk ? new Set(roles.map((r) => String(r.id))) : null;
    const rolesError = rolesOk ? null : `Couldn't load this server's roles (${meta?.error || "unknown"}). Saved mappings are shown; paste a role ID to add more.`;

    // Roblox group ranks — for the "highest rank they can assign" dropdown.
    let groupRanks = [];
    try {
      const { groupId } = await getConfig();
      if (groupId) groupRanks = (await listGroupRoles(groupId)).map((r) => ({ rank: Number(r.rank), name: r.name })).sort((a, b) => a.rank - b.rank);
    } catch { /* group ranks are optional — the UI degrades to a number input */ }

    const rows = await query("select config from guild_settings where guild_id=$1 and feature='role-access'", [guild]);
    const rawItems = Array.isArray(rows[0]?.config?.items) ? rows[0].config.items : [];
    // Sanitize and ALWAYS return every saved mapping — never hide one just because the live role list
    // didn't happen to include it (a partial/stale/failed Discord fetch must not make saved grants
    // "disappear"). Only annotate a role-targeted item whose role isn't currently visible.
    const items = rawItems.map(cleanItem).filter(Boolean).map((it) => (
      it.role && liveRoleIds && !liveRoleIds.has(String(it.role)) ? { ...it, missingRole: true } : it
    ));
    return NextResponse.json({ roles, groupRanks, items, rolesError });
  } catch (e) {
    return serverError(e.message);
  }
}

// POST { guild, items: [{ role, group: { actions, maxRank } }] } -> save the role->group map.
export async function POST(req) {
  const g = await guard();
  if (g.error) return g.error;
  const { guild, items } = await req.json().catch(() => ({}));
  if (!guild || !SITE_ROLE_GUILDS.includes(String(guild))) return badRequest("Bad server.");
  if (!Array.isArray(items)) return badRequest("Bad items.");

  // Persist EXACTLY what the super-owner set. We deliberately do NOT drop a mapping because the live
  // Discord role list didn't include it — a partial/stale/rate-limited role fetch was silently deleting
  // valid grants on save ("role access doesn't save"). Deduplicate only.
  const seen = new Set();
  const clean = [];
  for (const raw of items) {
    const it = cleanItem(raw);
    if (!it) continue;
    delete it.missingRole; // never persist the UI-only flag
    const key = it.role ? `r:${it.role}` : `u:${it.user}`;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(it);
  }

  try {
    await ensureSchema();
    const s = g.session;
    await query(
      `insert into guild_settings (guild_id, feature, enabled, config, updated_by, updated_at)
       values ($1, 'role-access', true, $2::jsonb, $3, now())
       on conflict (guild_id, feature) do update set enabled = true, config = $2::jsonb, updated_by = $3, updated_at = now()`,
      [String(guild), JSON.stringify({ items: clean }), String(s.id)],
    );
    // Bust every user's cached grants so this change takes effect on their next page load, not in 90s.
    await bumpGrantsVersion();
    // Audit trail: record who changed the role-access map for this server and a snapshot of the grants.
    try {
      const snap = clean.map((it) => {
        const who = it.user ? `user ${it.user}` : `role ${it.role}`;
        const what = [...(it.group?.actions || []), it.transcripts ? "transcripts" : null, ...(it.sections || [])].filter(Boolean).join("/") || "none";
        return `${who}: ${what}`;
      }).join("; ").slice(0, 600);
      await logAudit({ actorId: s.id, actorName: s.name, action: "role-access", target: String(guild), detail: `${clean.length} mapping(s) — ${snap || "cleared"}` });
    } catch { /* audit is best-effort */ }
    // Re-read the row we just wrote and return THAT — so the client reflects what is actually stored,
    // not merely what we attempted. If the write somehow didn't land, this surfaces it immediately.
    const back = await query("select config from guild_settings where guild_id=$1 and feature='role-access'", [String(guild)]);
    const saved = (Array.isArray(back[0]?.config?.items) ? back[0].config.items : []).map(cleanItem).filter(Boolean);
    return NextResponse.json({ ok: true, items: saved });
  } catch (e) {
    return serverError(e.message);
  }
}
