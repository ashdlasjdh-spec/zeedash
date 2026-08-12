import { query, ensureSchema } from "@/lib/db";
import { botAuthed } from "@/lib/botauth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The bot POSTs activity deltas here every minute (Bearer CRON_SECRET). We add them onto today's
// per-guild + per-channel rows. Deltas (not totals) so a bot restart never double-counts.
export async function POST(req) {
  if (!botAuthed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const { guildId, guildName, messages = 0, reactions = 0, voiceMinutes = 0, members = null, channels = [] } = body || {};
  if (!guildId) return NextResponse.json({ error: "guildId required" }, { status: 400 });

  try {
    await ensureSchema();
    await query(
      `insert into server_stats (guild_id, day, guild_name, messages, reactions, voice_minutes, members, updated_at)
       values ($1, current_date, $2, $3, $4, $5, $6, now())
       on conflict (guild_id, day) do update set
         messages = server_stats.messages + excluded.messages,
         reactions = server_stats.reactions + excluded.reactions,
         voice_minutes = server_stats.voice_minutes + excluded.voice_minutes,
         guild_name = coalesce(excluded.guild_name, server_stats.guild_name),
         members = coalesce(excluded.members, server_stats.members),
         updated_at = now()`,
      [String(guildId), guildName || null, Math.round(messages) || 0, Math.round(reactions) || 0, Math.round(voiceMinutes) || 0, members == null ? null : Math.round(members)],
    );
    for (const ch of Array.isArray(channels) ? channels.slice(0, 200) : []) {
      if (!ch?.id || !ch?.messages) continue;
      await query(
        `insert into channel_stats (guild_id, channel_id, day, channel_name, messages)
         values ($1, $2, current_date, $3, $4)
         on conflict (guild_id, channel_id, day) do update set
           messages = channel_stats.messages + excluded.messages,
           channel_name = coalesce(excluded.channel_name, channel_stats.channel_name)`,
        [String(guildId), String(ch.id), ch.name || null, Math.round(ch.messages) || 0],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
