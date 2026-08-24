import { getSession } from "@/lib/session";
import { isSuperOwner, GROUP_ACTIONS, RANK_ASSIGN_ACTIONS } from "@/lib/permissions";
import { getGuildMeta } from "@/lib/discord";
import { getConfig } from "@/lib/config";
import { listGroupRoles } from "@/lib/robloxGroups";
import { query, ensureSchema } from "@/lib/db";
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

// Sanitize one stored/posted item into { role, group: { actions, maxRank } } or null.
function cleanItem(it) {
  const role = String(it?.role || "").match(/^\d{5,}$/)?.[0];
  if (!role) return null;
  const g = it?.group || {};
  const actions = [...new Set((Array.isArray(g.actions) ? g.actions : []).map(String).filter((a) => GROUP_ACTIONS.includes(a)))];
  const transcripts = !!it?.transcripts; // may view ticket transcripts for this server
  if (!actions.length && !transcripts) return null; // grants nothing
  // A ceiling only matters when the role can lift people up; store it as a plain rank number.
  const needsCeiling = actions.some((a) => RANK_ASSIGN_ACTIONS.has(a));
  const mr = Number(g.maxRank);
  const maxRank = needsCeiling && Number.isFinite(mr) ? Math.max(0, Math.min(255, Math.floor(mr))) : null;
  return { role, group: { actions, maxRank }, transcripts };
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
    const meta = await getGuildMeta(guild);
    if (meta?.error) return NextResponse.json({ error: `Couldn't load roles (${meta.error}).` }, { status: meta.status || 500 });
    const liveRoleIds = new Set((meta.roles || []).map((r) => String(r.id)));

    // Roblox group ranks — for the "highest rank they can assign" dropdown.
    let groupRanks = [];
    try {
      const { groupId } = await getConfig();
      if (groupId) groupRanks = (await listGroupRoles(groupId)).map((r) => ({ rank: Number(r.rank), name: r.name })).sort((a, b) => a.rank - b.rank);
    } catch { /* group ranks are optional — the UI degrades to a number input */ }

    const rows = await query("select config from guild_settings where guild_id=$1 and feature='role-access'", [guild]);
    const rawItems = Array.isArray(rows[0]?.config?.items) ? rows[0].config.items : [];
    // Drop roles that no longer exist in the guild (auto-cleanup when a role is deleted), then sanitize.
    const items = rawItems.map(cleanItem).filter((it) => it && liveRoleIds.has(String(it.role)));
    return NextResponse.json({ roles: meta.roles || [], groupRanks, items });
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

  // Only keep roles that actually exist in the guild — deleting a role clears its mapping.
  let liveRoleIds = null;
  try { const meta = await getGuildMeta(String(guild)); if (Array.isArray(meta?.roles)) liveRoleIds = new Set(meta.roles.map((r) => String(r.id))); } catch { /* fall through */ }

  const seen = new Set();
  const clean = [];
  for (const raw of items) {
    const it = cleanItem(raw);
    if (!it || seen.has(it.role)) continue;
    if (liveRoleIds && !liveRoleIds.has(it.role)) continue;
    seen.add(it.role);
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
    return NextResponse.json({ ok: true, items: clean });
  } catch (e) {
    return serverError(e.message);
  }
}
