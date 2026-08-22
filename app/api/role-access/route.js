import { getSession } from "@/lib/session";
import { isSuperOwner, MANUAL_PERMS } from "@/lib/permissions";
import { getGuildMeta } from "@/lib/discord";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Super-owner-only: map a Discord ROLE to site capabilities for one of the allow-listed community
// servers. This writes the SAME `fake-permissions` config the Server portal uses, so it's enforced
// automatically — a member holding a mapped role gets those capabilities on the site with no extra
// wiring. Scoped strictly to the servers below.
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
  if (!s || !isSuperOwner(s.id)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session: s };
}

// GET            -> { guilds: [{ id, name, icon }] }  (the picker)
// GET ?guild=X   -> { roles: [{id,name}], items: [{role, perms}] }
export async function GET(req) {
  const g = await guard();
  if (g.error) return g.error;
  const guild = req.nextUrl.searchParams.get("guild") || "";

  try {
    await ensureSchema();
    if (!guild) {
      // Names/icons from stats where we have them, friendly labels otherwise.
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

    if (!SITE_ROLE_GUILDS.includes(guild)) return NextResponse.json({ error: "That server isn't managed here." }, { status: 400 });
    const meta = await getGuildMeta(guild);
    if (meta?.error) return NextResponse.json({ error: `Couldn't load roles (${meta.error}).` }, { status: meta.status || 500 });
    const rows = await query("select config from guild_settings where guild_id=$1 and feature='fake-permissions'", [guild]);
    const items = Array.isArray(rows[0]?.config?.items) ? rows[0].config.items : [];
    return NextResponse.json({ roles: meta.roles || [], items });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST { guild, items: [{ role, perms: string[] }] } -> save the role->capability map.
export async function POST(req) {
  const g = await guard();
  if (g.error) return g.error;
  const { guild, items } = await req.json().catch(() => ({}));
  if (!guild || !SITE_ROLE_GUILDS.includes(String(guild))) return NextResponse.json({ error: "Bad server." }, { status: 400 });
  if (!Array.isArray(items)) return NextResponse.json({ error: "Bad items." }, { status: 400 });

  // Sanitise: valid numeric role id + only known capability strings, joined as the config expects.
  const clean = [];
  for (const it of items) {
    const role = String(it?.role || "").match(/^\d{5,}$/)?.[0];
    if (!role) continue;
    const perms = [...new Set((Array.isArray(it?.perms) ? it.perms : []).map(String).filter((p) => MANUAL_PERMS.has(p)))];
    if (!perms.length) continue;
    clean.push({ role, perms: perms.join(",") });
  }

  try {
    await ensureSchema();
    const s = g.session;
    // Preserve any other keys already on the config (e.g. legacy `roles`), flip enabled on, set items.
    const rows = await query("select config from guild_settings where guild_id=$1 and feature='fake-permissions'", [String(guild)]);
    const prev = rows[0]?.config && typeof rows[0].config === "object" ? rows[0].config : {};
    const config = { ...prev, items: clean };
    await query(
      `insert into guild_settings (guild_id, feature, enabled, config, updated_by, updated_at)
       values ($1, 'fake-permissions', true, $2::jsonb, $3, now())
       on conflict (guild_id, feature) do update set enabled = true, config = $2::jsonb, updated_by = $3, updated_at = now()`,
      [String(guild), JSON.stringify(config), String(s.id)],
    );
    return NextResponse.json({ ok: true, items: clean });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
