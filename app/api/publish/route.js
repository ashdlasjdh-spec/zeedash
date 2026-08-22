import { getSession } from "@/lib/session";
import { canManageFeature } from "@/lib/permissions";
import { postChannelMessage, getGuildMeta } from "@/lib/discord";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Kinds and the Server feature that governs each, so a manual-permission holder can publish exactly
// the kinds their perms unlock (an "administrator" manual perm, or Discord admin, unlocks all of them).
const KIND_FEATURE = { message: "message-builder", buttonpanel: "button-roles", ticketpanel: "tickets", reactionseed: "reaction-roles", setnick: "customize" };

const DEFAULT_EMBED_COLOR = 0xe01f1f; // brand fallback when no valid #hex is given

// Build a Discord embed object from the Message Builder payload (mirrors the bot's buildMessagePayload).
function buildEmbed(p) {
  if (!p.title && !p.description && !p.image && !p.footer) return null;
  const e = { color: /^#[0-9a-fA-F]{6}$/.test(p.color || "") ? parseInt(String(p.color).slice(1), 16) : DEFAULT_EMBED_COLOR };
  if (p.title) e.title = String(p.title).slice(0, 256);
  if (p.description) e.description = String(p.description).slice(0, 4000);
  if (/^https?:\/\//.test(p.image || "")) e.image = { url: String(p.image) };
  if (p.footer) e.footer = { text: String(p.footer).slice(0, 2048) };
  return e;
}

// Publish an action from the dashboard (whoever manages the relevant feature in the guild).
//   kind "message"  -> posted DIRECTLY to Discord via the bot token, right now. No queue, instant, and
//                       it works even if the bot process is offline (returns the real success/failure).
//   panel kinds     -> still queued for the bot, because they need it to build components / seed
//                       reactions on existing messages (the bot polls /api/publish/pending and acks).
export async function POST(req) {
  const s = await getSession();
  const { guild, kind, payload } = await req.json().catch(() => ({}));
  const feature = KIND_FEATURE[String(kind || "")];
  if (!guild || !feature) return NextResponse.json({ error: "Bad guild/kind." }, { status: 400 });
  if (!s || !canManageFeature(s, guild, feature)) return NextResponse.json({ error: "You don't have permission to do this in that server." }, { status: 403 });

  // Instant path: post the message straight to the channel from here.
  if (kind === "message") {
    const p = payload || {};
    // Make sure the target channel belongs to the guild they're authorized for — don't let a crafted
    // request post into a server they don't manage. Best-effort: if the guild's channels can't be
    // loaded we fall through (the bot token still can't post anywhere it lacks permission).
    try {
      const meta = await getGuildMeta(String(guild));
      const chans = meta && !meta.error ? [...(meta.text || []), ...(meta.voice || [])] : null;
      if (chans && !chans.some((c) => c.id === String(p.channel))) {
        return NextResponse.json({ error: "Pick a channel in this server." }, { status: 400 });
      }
    } catch { /* couldn't verify — proceed */ }
    // Per-guild posting identity (custom name/avatar) from the Customize feature → post via webhook.
    let profile = null;
    try {
      const rows = await query("select config from guild_settings where guild_id=$1 and feature='customize'", [String(guild)]);
      const cfg = rows[0]?.config;
      if (cfg && (cfg.postName || cfg.postAvatar)) profile = { name: cfg.postName, avatarUrl: cfg.postAvatar };
    } catch { /* no custom profile — post as the bot */ }
    const res = await postChannelMessage(p.channel, { content: p.content, embed: buildEmbed(p), profile });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ ok: true, sent: true });
  }

  try {
    await ensureSchema();
    // Collapse duplicate pending requests of the same kind for a guild (avoid double-posts).
    await query("delete from publish_queue where guild_id=$1 and kind=$2 and status='pending'", [String(guild), String(kind)]);
    const rows = await query(
      `insert into publish_queue (guild_id, kind, payload, created_by)
       values ($1, $2, coalesce($3::jsonb, '{}'::jsonb), $4) returning id`,
      [String(guild), String(kind), payload == null ? null : JSON.stringify(payload), s.id],
    );
    return NextResponse.json({ ok: true, id: rows[0]?.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
