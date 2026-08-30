// Turn the free-text ban "evidence" field into the pieces the webhook needs to actually SHOW it, not
// just print a text line. Pure (no imports) so it's unit-tested and shared by both the site path
// (app/api/bans/route.js) and the bot path (lib/bans.js).
//
// Discord limitation: a webhook rich embed can show an inline IMAGE (embed.image.url) but CANNOT set a
// playable video — that only appears when a link is dropped in the message CONTENT (Discord unfurls
// YouTube/Streamable/Medal/Twitch and direct video files into a player) or when the file itself is
// uploaded as an attachment (not handled here — that needs an upload field). So we route a direct image
// URL to embed.image, and a video/known-provider URL to message content for its player.
const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|avif)(\?|#|$)/i;
const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const PROVIDER_RE = /(?:youtube\.com|youtu\.be|streamable\.com|medal\.tv|twitch\.tv|clips\.twitch\.tv|imgur\.com|gyazo\.com)/i;

// --- Uploaded evidence files (Discord /ban attachments) ------------------------------------------
// The bot forwards up to three uploaded files by their Discord CDN url; banAction re-uploads them to the
// ban-log webhook so they persist and render inline. These helpers pick/sanitize the list before any
// network fetch, so the byte-download step stays small and can't be pointed at arbitrary hosts.
export const MAX_BAN_FILES = 3;
export const MAX_BAN_FILE_BYTES = 24 * 1024 * 1024;  // per file
export const MAX_BAN_TOTAL_BYTES = 24 * 1024 * 1024; // all files combined

// Only fetch from Discord's own CDN — the urls come from interaction attachments, and this blocks the
// re-upload step from being turned into an SSRF against arbitrary/internal hosts.
export function isDiscordCdnUrl(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === "https:" && /(^|\.)discordapp\.(com|net)$/i.test(u.hostname);
  } catch { return false; }
}

// Make an attachment filename safe: drop any path, keep word chars/dot/dash/space, cap length.
export function sanitizeFileName(name) {
  const base = String(name || "").split(/[\\/]/).pop() || "";
  const clean = base.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 80);
  return clean || "evidence";
}

// Validate + cap the forwarded file list (pure — no network). Keeps at most MAX_BAN_FILES Discord-CDN
// https urls whose declared size fits the per-file and running-total caps.
export function selectBanFiles(files) {
  const list = Array.isArray(files) ? files : [];
  const out = [];
  let total = 0;
  for (const f of list) {
    if (out.length >= MAX_BAN_FILES) break;
    if (!f || !isDiscordCdnUrl(f.url)) continue;
    const size = Number(f.size) || 0;
    if (size > MAX_BAN_FILE_BYTES) continue;
    if (size && total + size > MAX_BAN_TOTAL_BYTES) continue;
    total += size;
    out.push({ url: f.url, name: sanitizeFileName(f.name), contentType: typeof f.contentType === "string" ? f.contentType : null, size });
  }
  return out;
}

// Where ban logs post, and the game label shown in them. Defaults match the requested format; both are
// overridable via config/env (see lib/config.js).
export const BAN_LOG_CHANNEL_DEFAULT = "1536813165189537844";
export const GAME_LABEL = "Zee Hood [FIXED]";

// Build the ban-log message CONTENT (not an embed) so the ## header, >>> blockquote, -# subtext, the
// <t:..:F> timestamp and the attached clip all render exactly like the reference format. Evidence reads
// "Attached below" when files are attached, else the provided link/text, else it's omitted.
export function banLogContent({ target, reasonText, evidenceText, noteText, caseId, actorName, actorId, actionLabel, hasFiles, unix }) {
  const profile = `https://www.roblox.com/users/${target.userId}/profile`;
  const ts = unix || Math.floor(Date.now() / 1000);
  const evidence = hasFiles ? "Attached below" : (evidenceText ? String(evidenceText).trim() : null);
  const lines = [
    `## ${target.displayName || target.username} (@${target.username})`,
    `>>> Username: [\`${target.username}\`](${profile})`,
    `User ID: ${target.userId}`,
    `Game: ${GAME_LABEL}`,
    ...(evidence ? [`Evidence: ${evidence}`] : []),
    `Reason: ${reasonText || "—"}`,
    ...(noteText ? [`Note: ${noteText}`] : []),
    `case_id: \`${caseId}\``,
    `Moderator: ${actorName} (id: ${actorId})`,
    `-# ⏱️ Action taken on: <t:${ts}:F> - ${actionLabel}`,
  ];
  return lines.join("\n");
}

// Post the ban log. Prefers posting AS THE BOT to a channel (Discord REST + a bot token) so it shows
// with the bot's identity; falls back to a webhook URL when no bot token is configured. Files (clips /
// images) go as multipart attachments in the same message; if that's rejected (e.g. a file over the
// server's upload limit) it retries content-only so the log still posts. Returns a short status string.
export async function sendBanMessage({ url, channelId, botToken, content, files }) {
  const useBot = !!(botToken && channelId);
  if (!useBot && !url) return "no ban destination configured";
  const endpoint = useBot ? `https://discord.com/api/v10/channels/${channelId}/messages` : url;
  const auth = useBot ? { Authorization: `Bot ${botToken}` } : {};
  const label = useBot ? "bot" : "webhook";
  const contentOnly = () =>
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...auth }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) });
  const prepared = Array.isArray(files) ? files : [];
  try {
    let wr;
    if (prepared.length) {
      const form = new FormData();
      form.append("payload_json", JSON.stringify({ content, allowed_mentions: { parse: [] }, attachments: prepared.map((f, i) => ({ id: i, filename: f.name })) }));
      prepared.forEach((f, i) => form.append(`files[${i}]`, f.blob, f.name));
      wr = await fetch(endpoint, { method: "POST", headers: auth, body: form });
      if (!wr.ok) wr = await contentOnly(); // file too big for the server → still post the text
    } else {
      wr = await contentOnly();
    }
    return wr.ok ? "sent" : `${label} ${wr.status}`;
  } catch (e) {
    return `${label} error: ${e.message}`;
  }
}

// Turn browser-uploaded evidence files (web File/Blob objects) into [{ name, blob }] for the webhook,
// capped by count / per-file / total size. Used by the site Bans form (the files arrive as real uploads,
// so there's no CDN fetch — unlike the bot path which re-downloads from Discord).
export async function prepareUploadedFiles(list) {
  const out = [];
  let total = 0;
  for (const f of (Array.isArray(list) ? list : []).slice(0, MAX_BAN_FILES)) {
    try {
      if (!f || typeof f.arrayBuffer !== "function") continue;
      if ((Number(f.size) || 0) > MAX_BAN_FILE_BYTES) continue;
      const buf = Buffer.from(await f.arrayBuffer());
      if (!buf.length || buf.length > MAX_BAN_FILE_BYTES || total + buf.length > MAX_BAN_TOTAL_BYTES) continue;
      total += buf.length;
      out.push({ name: sanitizeFileName(f.name), blob: new Blob([buf], f.type ? { type: f.type } : {}) });
    } catch { /* skip a bad file; the ban + embed still go through */ }
  }
  return out;
}

export function evidenceParts(evidenceText) {
  const text = String(evidenceText || "").trim();
  if (!text) return { line: "", imageUrl: null, contentUrl: null };
  // First http(s) URL in the field; strip trailing punctuation that isn't part of the link.
  const m = text.match(/https?:\/\/\S+/i);
  const url = m ? m[0].replace(/[)\].,>]+$/, "") : null;
  const isImage = !!url && IMAGE_RE.test(url);
  const isVideo = !!url && VIDEO_RE.test(url);
  const isProvider = !!url && PROVIDER_RE.test(url);
  return {
    // The text line for the embed (URLs auto-link inside an embed description) — unchanged behavior.
    line: `> Evidence: ${text}`,
    // Direct image → big inline preview in the embed.
    imageUrl: isImage ? url : null,
    // Video file or a provider Discord can unfurl → put in message content so it renders a player/preview
    // below the embed. Non-media links (a Google Doc, a plain page) stay as the auto-linked text line only.
    contentUrl: url && !isImage && (isVideo || isProvider) ? url : null,
  };
}
