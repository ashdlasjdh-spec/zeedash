import { getSession } from "@/lib/session";
import { isSuperOwner, SITE_CAPS } from "@/lib/permissions";
import { getGuildMeta } from "@/lib/discord";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Super-owner-only: map a Discord ROLE to SITE capabilities (crew tags, emojis, grants, bans, …) for
// one of the community servers. This is its OWN feature ("role-access") — separate from fake-permissions
// (which grants Server-portal feature access). Members holding a mapped role get those Game-portal
// abilities on the site automatically (resolved in getSession as session.caps).
const SITE_ROLE_GUILDS = [
  "1447037325380157452",
  "1496219608800170004",
  "1494327144829026354",
];
const GUILD_LABELS = {
  "1447037325380157452": "ZHD",
  "1496219608800170004": "ZHD Board",
  "1494327144829026354": "ZHD HOF",
};

async function guard() {
  const s = await getSession();
  if (!s || !isSuperOwner(s.id)) return { error: forbidden() };
  return { session: s };
}

// GET            -> { guilds: [{ id, name, icon }] }
// GET ?guild=X   -> { roles: [{id,name}], items: [{ role, caps: string[] }] }
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
    const rows = await query("select config from guild_settings where guild_id=$1 and feature='role-access'", [guild]);
    const rawItems = Array.isArray(rows[0]?.config?.items) ? rows[0].config.items : [];
    const items = rawItems.map((it) => ({ role: String(it.role), caps: (Array.isArray(it.caps) ? it.caps : []).filter((c) => SITE_CAPS.includes(c)) }));
    return NextResponse.json({ roles: meta.roles || [], items });
  } catch (e) {
    return serverError(e.message);
  }
}

// POST { guild, items: [{ role, caps: string[] }] } -> save the role->capability map.
export async function POST(req) {
  const g = await guard();
  if (g.error) return g.error;
  const { guild, items } = await req.json().catch(() => ({}));
  if (!guild || !SITE_ROLE_GUILDS.includes(String(guild))) return badRequest("Bad server.");
  if (!Array.isArray(items)) return badRequest("Bad items.");

  const clean = [];
  for (const it of items) {
    const role = String(it?.role || "").match(/^\d{5,}$/)?.[0];
    if (!role) continue;
    const caps = [...new Set((Array.isArray(it?.caps) ? it.caps : []).map(String).filter((c) => SITE_CAPS.includes(c)))];
    if (!caps.length) continue;
    clean.push({ role, caps });
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
