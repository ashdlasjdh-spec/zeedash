import { getSession } from "@/lib/session";
import { canManageFeature } from "@/lib/permissions";
import { getGuildMeta, postChannelMessage, editChannelMessage, deleteChannelMessage } from "@/lib/discord";
import { query, ensureSchema, logAudit } from "@/lib/db";
import { NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

const FEATURE = "embeds";
const DEFAULT_COLOR = 0xe01f1f;

// Turn a stored embed record into the Discord embed object (or null if it has no visible embed body —
// a content-only message is still valid). Mirrors the bot's buildMessagePayload.
function buildEmbed(p) {
  if (!p.title && !p.description && !p.image && !p.footer) return null;
  const e = { color: /^#[0-9a-fA-F]{6}$/.test(p.color || "") ? parseInt(String(p.color).slice(1), 16) : DEFAULT_COLOR };
  if (p.title) e.title = String(p.title).slice(0, 256);
  if (p.description) e.description = String(p.description).slice(0, 4000);
  if (/^https?:\/\//.test(p.image || "")) e.image = { url: String(p.image) };
  if (p.footer) e.footer = { text: String(p.footer).slice(0, 2048) };
  return e;
}

// Sanitize one embed record from the client into what we store. Keeps the stored messageId/channel of
// the live message (set by post) unless the caller explicitly changes them.
function cleanEmbed(raw, prev = {}) {
  const id = String(raw?.id || prev.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)));
  const clip = (v, n) => (v == null ? "" : String(v).slice(0, n));
  return {
    id,
    name: clip(raw?.name, 80) || "Untitled embed",
    channel: /^\d{5,}$/.test(String(raw?.channel || "")) ? String(raw.channel) : (prev.channel || ""),
    content: clip(raw?.content, 2000),
    title: clip(raw?.title, 256),
    description: clip(raw?.description, 4000),
    color: /^#[0-9a-fA-F]{6}$/.test(raw?.color || "") ? raw.color : (prev.color || ""),
    image: /^https?:\/\//.test(String(raw?.image || "")) ? String(raw.image) : "",
    footer: clip(raw?.footer, 2048),
    messageId: prev.messageId || null, // set once posted; edits target this live message
    postedChannel: prev.postedChannel || null, // channel the live message actually lives in
  };
}

async function loadItems(guild) {
  const rows = await query("select config from guild_settings where guild_id=$1 and feature=$2", [String(guild), FEATURE]);
  return Array.isArray(rows[0]?.config?.items) ? rows[0].config.items : [];
}
async function saveItems(guild, items, actorId) {
  await query(
    `insert into guild_settings (guild_id, feature, enabled, config, updated_by, updated_at)
     values ($1,$2,true,$3::jsonb,$4,now())
     on conflict (guild_id, feature) do update set enabled=true, config=$3::jsonb, updated_by=$4, updated_at=now()`,
    [String(guild), FEATURE, JSON.stringify({ items }), String(actorId || "")],
  );
}

async function guard(guild) {
  const s = await getSession();
  if (!s) return { error: forbidden("Sign in.") };
  if (!guild) return { error: badRequest("No server.") };
  if (!canManageFeature(s, guild, FEATURE)) return { error: forbidden("You can't manage embeds in that server.") };
  return { session: s };
}

// GET ?guild=X -> { items, channels }
export async function GET(req) {
  const guild = req.nextUrl.searchParams.get("guild") || "";
  const g = await guard(guild);
  if (g.error) return g.error;
  try {
    await ensureSchema();
    const items = await loadItems(guild);
    let channels = [];
    try { const meta = await getGuildMeta(String(guild)); if (meta && !meta.error) channels = meta.text || []; } catch { /* optional */ }
    return NextResponse.json({ items, channels });
  } catch (e) { return serverError(e.message); }
}

// POST { guild, action, item?, id? } — action ∈ save | post | update | delete
export async function POST(req) {
  const { guild, action, item, id } = await req.json().catch(() => ({}));
  const g = await guard(guild);
  if (g.error) return g.error;
  try {
    await ensureSchema();
    let items = await loadItems(guild);
    const idx = (eid) => items.findIndex((x) => String(x.id) === String(eid));

    if (action === "save" || action === "post") {
      const i = idx(item?.id);
      const rec = cleanEmbed(item, i >= 0 ? items[i] : {});
      if (!buildEmbed(rec) && !rec.content) return badRequest("Add a title, description or message text first.");
      if (action === "post") {
        if (!rec.channel) return badRequest("Pick a channel to post in.");
        // Verify the channel belongs to this guild (don't let a crafted request post elsewhere).
        try {
          const meta = await getGuildMeta(String(guild));
          const chans = meta && !meta.error ? (meta.text || []) : null;
          if (chans && !chans.some((c) => c.id === rec.channel)) return badRequest("Pick a channel in this server.");
        } catch { /* proceed */ }
        const res = await postChannelMessage(rec.channel, { content: rec.content, embed: buildEmbed(rec) });
        if (!res.ok) return badRequest(res.error);
        rec.messageId = res.id || null;
        rec.postedChannel = rec.channel;
      }
      if (i >= 0) items[i] = rec; else items.push(rec);
      await saveItems(guild, items, g.session.id);
      try { await logAudit({ actorId: g.session.id, actorName: g.session.name, action: `embed-${action}`, target: String(guild), detail: `${rec.name}${action === "post" ? ` → posted (${rec.messageId || "?"})` : ""}` }); } catch { /* best-effort */ }
      return NextResponse.json({ ok: true, items, posted: action === "post", savedId: rec.id });
    }

    if (action === "update") {
      const i = idx(item?.id ?? id);
      if (i < 0) return badRequest("Embed not found.");
      const rec = cleanEmbed(item, items[i]);
      if (!rec.messageId || !rec.postedChannel) return badRequest("This embed hasn't been posted yet — use Post first.");
      const res = await editChannelMessage(rec.postedChannel, rec.messageId, { content: rec.content, embed: buildEmbed(rec) });
      if (!res.ok) {
        // If the live message is gone, clear the link so the UI offers Post again.
        if (/message is gone|deleted in Discord/i.test(res.error)) { rec.messageId = null; rec.postedChannel = null; items[i] = rec; await saveItems(guild, items, g.session.id); return NextResponse.json({ ok: false, items, error: res.error }, { status: 200 }); }
        return badRequest(res.error);
      }
      items[i] = rec;
      await saveItems(guild, items, g.session.id);
      try { await logAudit({ actorId: g.session.id, actorName: g.session.name, action: "embed-update", target: String(guild), detail: `${rec.name} (${rec.messageId})` }); } catch { /* best-effort */ }
      return NextResponse.json({ ok: true, items });
    }

    if (action === "delete") {
      const i = idx(id);
      if (i < 0) return badRequest("Embed not found.");
      const rec = items[i];
      if (rec.messageId && rec.postedChannel) { try { await deleteChannelMessage(rec.postedChannel, rec.messageId); } catch { /* best-effort — remove the record regardless */ } }
      items = items.filter((_, n) => n !== i);
      await saveItems(guild, items, g.session.id);
      try { await logAudit({ actorId: g.session.id, actorName: g.session.name, action: "embed-delete", target: String(guild), detail: rec.name }); } catch { /* best-effort */ }
      return NextResponse.json({ ok: true, items });
    }

    return badRequest("Unknown action.");
  } catch (e) { return serverError(e.message); }
}
