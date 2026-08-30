import { getConfig } from "@/lib/config";
import { resolveUsername } from "@/lib/roblox";
import { logAudit } from "@/lib/db";
import { sendBanMessage, banLogContent, prepareUploadedFiles } from "@/lib/banEvidence";
export { sendBanMessage, banLogContent, prepareUploadedFiles }; // re-export for the site ban route

function newCaseId() {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = (n) => Array.from({ length: n }, () => A[Math.floor(Math.random() * A.length)]).join("");
  return `RD-${seg(8)}-${seg(6)}`;
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
  const { banLogChannel } = await getConfig();
  // Build the log text here (so the format stays in one place), but the BOT posts it + the clips itself:
  // it runs on Railway with no serverless upload cap, so evidence clips up to the server's Discord limit
  // (e.g. 100MB on a Level-3 boost) go straight through — no re-download/re-upload via this function.
  const hasFiles = Array.isArray(files) && files.length > 0;
  const logContent = banLogContent({
    target, reasonText, evidenceText, noteText, caseId, actorName, actorId, actionLabel, hasFiles,
  });

  await logAudit({ actorId, actorName, action, category: "ban", target: `${target.username} (${target.userId})`, detail: `${reasonText || ""} [${caseId}]`.trim() });
  return { ok: true, action, user: target, caseId, logContent, logChannel: banLogChannel, note: publishNote || undefined };
}
