import { query, ensureSchema } from "@/lib/db";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Bot-facing read of a guild's feature settings (CRON_SECRET). The bot polls this and caches it,
// then no-ops on any feature whose enabled flag is false / absent. Only enabled rows matter.
export async function GET(req) {
  if (!botAuthed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!guild) return NextResponse.json({ settings: {} });
  try {
    await ensureSchema();
    const rows = await query("select feature, enabled, config from guild_settings where guild_id=$1 and enabled = true", [guild]);
    const settings = {};
    for (const r of rows) settings[r.feature] = { enabled: true, config: r.config || {} };
    return NextResponse.json({ settings }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Bot-facing edit of a comma-list config key (e.g. antinuke whitelist / admins). Reads the current
// config regardless of enabled state, adds/removes one ID, writes back. { guild, feature, key, add?, remove? }.
const FEATURE = /^[a-z0-9_-]{2,40}$/;
export async function POST(req) {
  if (!botAuthed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  const { guild, feature, key, add, remove } = await req.json().catch(() => ({}));
  if (!guild || !FEATURE.test(String(feature || "")) || !/^[a-z_]{2,20}$/.test(String(key || ""))) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const rows = await query("select config from guild_settings where guild_id=$1 and feature=$2", [String(guild), String(feature)]);
    const config = rows[0]?.config || {};
    let list = String(config[key] || "").split(/[\s,]+/).filter(Boolean);
    if (add && /^\d{5,}$/.test(String(add)) && !list.includes(String(add))) list.push(String(add));
    if (remove) list = list.filter((x) => x !== String(remove));
    config[key] = list.join(",");
    await query(
      `insert into guild_settings (guild_id, feature, enabled, config, updated_by, updated_at)
       values ($1, $2, false, $3::jsonb, 'bot', now())
       on conflict (guild_id, feature) do update set config = $3::jsonb, updated_at = now()`,
      [String(guild), String(feature), JSON.stringify(config)],
    );
    return NextResponse.json({ list });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
