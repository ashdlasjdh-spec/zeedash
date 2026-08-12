import { query, ensureSchema } from "@/lib/db";
import { botAuthed } from "@/lib/botauth";
import { levelFromXp } from "@/lib/levels";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Bot-facing XP award (CRON_SECRET). The bot calls this (per-user cooldown) while Levels is enabled.
// Returns the new level and whether the member just leveled up, so the bot can post + assign rewards.
export async function POST(req) {
  if (!botAuthed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  const { guild, user, xp } = await req.json().catch(() => ({}));
  const delta = Math.max(0, Math.min(1000, Math.round(Number(xp) || 0)));
  if (!guild || !/^\d{5,}$/.test(String(user || "")) || !delta) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    await ensureSchema();
    const rows = await query(
      `insert into member_levels (guild_id, user_id, xp, updated_at) values ($1, $2, $3, now())
       on conflict (guild_id, user_id) do update set xp = member_levels.xp + $3, updated_at = now()
       returning xp`,
      [String(guild), String(user), delta],
    );
    const newXp = Number(rows[0]?.xp || delta);
    const oldXp = Math.max(0, newXp - delta);
    const oldLevel = levelFromXp(oldXp);
    const level = levelFromXp(newXp);
    return NextResponse.json({ xp: newXp, level, leveledUp: level > oldLevel });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
