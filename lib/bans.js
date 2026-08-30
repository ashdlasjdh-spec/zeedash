import { getConfig } from "@/lib/config";
import { resolveUsername } from "@/lib/roblox";
import { logAudit } from "@/lib/db";
import { kvGetJSON, kvSetJSON } from "@/lib/kv";
import { evidenceParts, selectBanFiles, sendBanWebhook, prepareUploadedFiles, MAX_BAN_FILE_BYTES, MAX_BAN_TOTAL_BYTES } from "@/lib/banEvidence";
export { sendBanWebhook, prepareUploadedFiles }; // re-export so existing importers of @/lib/bans still work

// Download the (already validated + capped) evidence files from Discord's CDN and turn each into a Blob
// for the multipart webhook upload. Enforces the byte caps on the ACTUAL bytes (declared size can lie),
// and skips anything that fails — a ban is never blocked on evidence upload.
async function prepareBanFiles(files) {
  const chosen = selectBanFiles(files);
  const out = [];
  let total = 0;
  for (const f of chosen) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(f.url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length || buf.length > MAX_BAN_FILE_BYTES || total + buf.length > MAX_BAN_TOTAL_BYTES) continue;
      total += buf.length;
      out.push({ name: f.name, blob: new Blob([buf], f.contentType ? { type: f.contentType } : {}) });
    } catch { /* skip this file; ban + embed still go through */ }
  }
  return out;
}

const GAME_NAME = "Zee Hood Game";
function newCaseId() {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = (n) => Array.from({ length: n }, () => A[Math.floor(Math.random() * A.length)]).join("");
  return `RD-${seg(8)}-${seg(6)}`;
}
async function headshotUrl(userId) {
  // Avatar headshot URLs barely change, and Roblox's thumbnails API rate-limits shared IPs, so cache
  // the resolved URL cross-instance for an hour. Fail-open. Only successful lookups are cached (a
  // transient error isn't, so it retries next time).
  const key = `rbxhead:${userId}`;
  const cached = await kvGetJSON(key);
  if (cached && typeof cached.url === "string") return cached.url || null;
  try {
    const r = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
    if (r.ok) { const d = await r.json(); const url = d?.data?.[0]?.imageUrl || null; kvSetJSON(key, { url: url || "" }, 3600); return url; }
  } catch {}
  return null;
}
async function banConfig() {
  const { apiKey, universeId, banApiKey } = await getConfig();
  return { banKey: banApiKey || apiKey, universeId };
}
async function resolveTarget(input) {
  let target = await resolveUsername(input).catch(() => null);
  if (!target) { await new Promise((r) => setTimeout(r, 400)); target = await resolveUsername(input).catch(() => null); }
  if (!target) {
    const idOnly = String(input).trim();
    if (!/^\d+$/.test(idOnly)) return null;
    target = { userId: idOnly, username: idOnly, displayName: idOnly };
  }
  return target;
}

// Look up a user's current game-ban status.
export async function lookupBan(input) {
  const { banKey, universeId } = await banConfig();
  if (!banKey || !universeId) return { error: "Bans not configured (API key + universe id).", status: 500 };
  const target = await resolveTarget(input);
  if (!target) return { error: "No such Roblox user.", status: 404 };
  try {
    const r = await fetch(`https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions/${target.userId}`, { headers: { "x-api-key": banKey } });
    const g = (r.ok ? (await r.json().catch(() => null))?.gameJoinRestriction : null) || {};
    return { ok: true, user: target, active: !!g.active, reason: g.displayReason || g.privateReason || "", startTime: g.startTime || null, duration: g.duration || null };
  } catch (e) { return { error: e.message, status: 502 }; }
}

// Ban / unban / kick / warn a Roblox user in the game. Returns { ok, action, user, caseId, ... } or { error, status }.
export async function banAction({ input, reason, duration, evidence, note, files, action = "ban", actorName, actorId }) {
  const isBan = action === "ban";
  const actionLabel = action === "kick" ? "Kick" : action === "warn" ? "Warn" : isBan ? "Ban" : "Unban";
  const reasonText = String(reason || "").trim();
  const evidenceText = String(evidence || "").trim();
  const noteText = String(note || "").trim().slice(0, 500); // internal staff note — never sent to the game reason
  if ((isBan || action === "warn") && !reasonText) return { error: `A reason is required to ${actionLabel.toLowerCase()}.`, status: 400 };

  const { banKey, universeId } = await banConfig();
  if (!banKey || !universeId) return { error: "Ban not configured: set a Bans API key + a universe id.", status: 500 };

  const target = await resolveTarget(input);
  if (!target) return { error: "No such Roblox user.", status: 404 };

  let publishNote = "";
  if (action === "kick" || action === "warn") {
    const topic = action === "kick" ? "ModKick" : "ModWarn";
    const message = JSON.stringify({ userId: Number(target.userId), reason: reasonText, by: actorName });
    const kr = await fetch(`https://apis.roblox.com/messaging-service/v1/universes/${universeId}/topics/${topic}`, {
      method: "POST", headers: { "x-api-key": banKey, "Content-Type": "application/json" }, body: JSON.stringify({ message }),
    });
    if (!kr.ok) {
      const detail = `Roblox ${kr.status}: ${(await kr.text()).slice(0, 250)}`;
      if (action === "kick") return { error: `Kick publish failed — ${detail}`, status: 502 };
      publishNote = `in-game notice not delivered (${detail})`;
    }
  } else {
    const gameJoinRestriction = isBan
      ? { active: true, privateReason: reasonText, displayReason: reasonText, excludeAltAccounts: false,
          ...(duration ? { duration: /^\d+$/.test(String(duration)) ? `${duration}s` : String(duration) } : {}) }
      : { active: false };
    const url = `https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions/${target.userId}`;
    let res, lastBody = "";
    for (let attempt = 1; attempt <= 6; attempt++) {
      res = await fetch(url, { method: "PATCH", headers: { "x-api-key": banKey, "Content-Type": "application/json" }, body: JSON.stringify({ gameJoinRestriction }) });
      if (res.ok) break;
      lastBody = (await res.text()).slice(0, 250);
      const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
      if (!retryable || attempt === 6) return { error: `Roblox ${res.status}: ${lastBody}`, status: 502 };
      const ra = Number(res.headers.get("retry-after"));
      await new Promise((r) => setTimeout(r, ra > 0 ? Math.min(30000, ra * 1000) : Math.min(15000, 2000 * 2 ** (attempt - 1))));
    }
  }

  const caseId = newCaseId();
  let webhook = "no BAN_WEBHOOK_URL set";
  const hook = process.env.BAN_WEBHOOK_URL;
  if (hook) {
    const thumb = await headshotUrl(target.userId);
    const unix = Math.floor(Date.now() / 1000);
    const profile = `https://www.roblox.com/users/${target.userId}/profile`;
    const ev = evidenceParts(evidenceText);
    const description =
      `## ${target.displayName || target.username} (@${target.username})\n` +
      `> Username: [\`${target.username}\`](${profile})\n> User ID: ${target.userId}\n> Game: ${GAME_NAME}\n` +
      `> Reason: ${reasonText || "—"}\n` + (ev.line ? ev.line + "\n" : "") + (noteText ? `> Note: ${noteText}\n` : "") +
      `> case_id: \`${caseId}\`\n> Moderator: ${actorName} (id: ${actorId})\n-# Action taken on: <t:${unix}:F> - ${actionLabel}`;
    // Image evidence → inline preview; clip/video link → message content for Discord's player (see banEvidence).
    const embed = { description, ...(thumb ? { thumbnail: { url: thumb } } : {}), ...(ev.imageUrl ? { image: { url: ev.imageUrl } } : {}) };
    // Uploaded evidence files: re-upload them to the webhook so they persist and render inline (a Discord
    // interaction's own CDN links expire). Sent in the SAME message as the embed via multipart, like the
    // moderation apps do. Falls back to a plain JSON post when there are no (usable) files.
    webhook = await sendBanWebhook(hook, { embed, contentUrl: ev.contentUrl, files: await prepareBanFiles(files) });
  }

  await logAudit({ actorId, actorName, action, category: "ban", target: `${target.username} (${target.userId})`, detail: `${reasonText || ""} [${caseId}]`.trim() });
  return { ok: true, action, user: target, caseId, webhook, note: publishNote || undefined };
}
