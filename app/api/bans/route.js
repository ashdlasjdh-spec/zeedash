import { getSession } from "@/lib/session";
import { canBanS } from "@/lib/permissions";
import { resolveUsername, cacheGetMany, cachePut } from "@/lib/roblox";
import { getConfig, setConfig } from "@/lib/config";
import { logAudit, query } from "@/lib/db";
import { NextResponse } from "next/server";
import { forbidden, notFound, serverError } from "@/lib/api";
import { evidenceParts } from "@/lib/banEvidence";
import { sendBanWebhook, prepareUploadedFiles } from "@/lib/bans";

export const dynamic = "force-dynamic";
// Allow time to sit through a rate-limit window and retry (see the retry loop below).
export const maxDuration = 60;

const GAME_NAME = "Zee Hood Game";

function banConfig(c) {
  const key = c.banApiKey || c.apiKey;
  return { key, universeId: c.universeId };
}

// --- per-instance helpers (best-effort; reset on cold start, per serverless node) ---

// Cache the full active-ban scan briefly so page loads, refreshes, and post-action reloads
// don't re-scan Roblox (and re-resolve ~hundreds of usernames) on every single request.
const SCAN_TTL_MS = 12_000;
let scanCache = null; // { at:number, payload:object }
function invalidateScan() { scanCache = null; }

// Resolved usernames persist across scans so a rate-limited batch call can't flip names back
// to raw ids, and repeat polls don't re-resolve everyone. userId(str) -> { username, displayName }.
const nameCache = new Map();

// Lightweight sliding-window rate limiter keyed per session — a best-effort abuse guard on
// top of the auth gate. Caps runaway typing/refresh loops and a hammered leaked session.
const rlHits = new Map(); // key -> number[]
function rateLimited(key, max, windowMs) {
  const now = Date.now();
  const arr = (rlHits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  rlHits.set(key, arr);
  if (rlHits.size > 500) for (const [k, v] of rlHits) if (!v.some((t) => now - t < windowMs)) rlHits.delete(k);
  return arr.length > max;
}

// GET /api/bans          -> scan every ACTIVE game ban (live from Open Cloud)
// GET /api/bans?user=X   -> resolve one target (avatar, id, ban status, history)
export async function GET(req) {
  const s = await getSession();
  if (!s || !canBanS(s)) return forbidden();
  if (rateLimited(`get:${s.id}`, 50, 10_000)) return NextResponse.json({ error: "Slow down — too many requests." }, { status: 429 });
  const { key, universeId } = banConfig(await getConfig());
  if (!key || !universeId) return serverError("Bans not configured (API key + universe id).");

  let user = req.nextUrl.searchParams.get("user");
  const caseId = req.nextUrl.searchParams.get("case");
  const full = req.nextUrl.searchParams.get("full") === "1" || !!caseId; // case lookup always full

  // ---- case-id lookup: find the audit entry, pull its user id, then look up ----
  if (caseId && !user) {
    let row;
    try { const rows = await query("select target from audit_log where category='ban' and detail like $1 order by created_at desc limit 1", [`%[${caseId}]%`]); row = rows[0]; } catch {}
    if (!row) return notFound("No case with that id.");
    user = (String(row.target).match(/\((\d+)\)/) || [])[1];
    if (!user) return notFound("That case has no user id.");
  }

  // ---- single-target lookup (live resolve while typing / full lookup page) ----
  if (user) {
    // resolveUsername can throw (Roblox 429/network) — never let that 500 the endpoint,
    // or the "resolve as you type" card just goes blank.
    let t = null;
    try { t = await resolveUsername(user); } catch { return NextResponse.json({ error: "Lookup rate-limited — try again." }, { status: 503 }); }
    if (!t) return notFound("No such Roblox user.");

    // Ban status and history are independent — fetch them in parallel. The avatar is resolved
    // client-side via <Avatar/>, so we deliberately skip the slow thumbnails call here.
    const restrUrl = `https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions/${t.userId}`;
    const [restr, history, actions] = await Promise.all([
      fetch(restrUrl, { headers: { "x-api-key": key } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      query(
        "select action, detail, actor_name, actor_id, created_at from audit_log where category='ban' and target like $1 order by created_at desc limit 100",
        [`%(${t.userId})%`],
      ).catch(() => []),
      // Full profile: EVERY recorded action on this user (grants, moderation, tags…), not just bans.
      full
        ? query(
            "select action, category, item_key, detail, actor_name, actor_id, created_at from audit_log where target like $1 order by created_at desc limit 200",
            [`%(${t.userId})%`],
          ).catch(() => [])
        : Promise.resolve([]),
    ]);
    const g = (restr && restr.gameJoinRestriction) || {};
    const u = {
      userId: String(t.userId), username: t.username, displayName: t.displayName || t.username,
      active: !!g.active, reason: g.displayReason || g.privateReason || "",
      duration: g.duration || null, startTime: g.startTime || null,
      historyCount: history.length,
    };
    return NextResponse.json(full ? { user: u, history, actions } : { user: u });
  }

  // ---- full scan of active bans (paginate the restriction list) ----
  // Serve from the short-lived cache unless the caller forces a fresh scan (Refresh button).
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  if (!fresh && scanCache && Date.now() - scanCache.at < SCAN_TTL_MS) {
    return NextResponse.json({ ...scanCache.payload, cached: true });
  }

  const active = [];
  let pageToken = "";
  try {
    for (let i = 0; i < 40; i++) {
      const url = `https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions?maxPageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
      const r = await fetch(url, { headers: { "x-api-key": key } });
      if (!r.ok) {
        console.error(`[bans] scan Roblox ${r.status}:`, (await r.text()).slice(0, 300));
        return NextResponse.json({ error: `Roblox scan failed (${r.status}).` }, { status: 502 });
      }
      const d = await r.json();
      for (const ur of d.userRestrictions || []) {
        const g = ur.gameJoinRestriction || {};
        if (g.active) active.push({ userId: String(ur.user || "").split("/").pop(), reason: g.displayReason || g.privateReason || "", startTime: g.startTime || null, duration: g.duration || null });
      }
      pageToken = d.nextPageToken || "";
      if (!pageToken) break;
    }
  } catch (e) {
    console.error("[bans] scan failed:", e);
    return serverError("Scan failed — see server logs.");
  }

  // Resolve usernames, persisting them across scans in a module cache. This keeps names stable
  // when a batch call gets rate-limited (they'd otherwise flip back to raw IDs on the next
  // poll), and means each poll only resolves NEW ids instead of re-resolving all ~170 every 12s.
  const idStrs = active.map((a) => a.userId).filter(Boolean);
  let missing = [...new Set(idStrs.filter((id) => !nameCache.has(id)).map(Number).filter(Boolean))];
  // First fill from the persistent DB cache (cross-instance) so we only hit Roblox for names
  // we've genuinely never seen — this is what stops Vercel's shared IP getting 429'd every load.
  if (missing.length) {
    const dbHits = await cacheGetMany(missing);
    for (const [id, v] of dbHits) nameCache.set(id, v);
    missing = missing.filter((id) => !dbHits.has(String(id)));
  }
  // Resolve remaining usernames in PARALLEL batches with a hard time budget. With ~1,450 bans the
  // old sequential loop (15 batches × up to 4 retries) could take 30–60s and block the whole
  // response. Now a pool of workers drains the batches, and once the budget elapses we return
  // what we have — anything still a raw id gets filled by the next 12s poll (nameCache persists).
  const chunks = [];
  for (let i = 0; i < missing.length; i += 100) chunks.push(missing.slice(i, i + 100));
  const deadline = Date.now() + 12_000;
  let ci = 0;
  async function worker() {
    while (ci < chunks.length && Date.now() < deadline) {
      const chunk = chunks[ci++];
      for (let attempt = 1; attempt <= 3 && Date.now() < deadline; attempt++) {
        try {
          const r = await fetch("https://users.roblox.com/v1/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds: chunk, excludeBannedUsers: false }),
          });
          if (r.ok) {
            const d = await r.json();
            for (const u of d.data || []) {
              const v = { username: u.name, displayName: u.displayName };
              nameCache.set(String(u.id), v);
              cachePut({ userId: u.id, username: u.name, displayName: u.displayName }); // persist to DB cache
            }
            break;
          }
          if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 250 * attempt + Math.random() * 300)); continue; }
          break; // non-retryable
        } catch {
          await new Promise((res) => setTimeout(res, 250 * attempt));
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, chunks.length) }, worker));
  const bans = active.map((a) => {
    const n = nameCache.get(a.userId);
    return { ...a, username: n?.username || a.userId, displayName: n?.displayName || n?.username || a.userId };
  });
  const payload = { scope: GAME_NAME, count: bans.length, bans };
  scanCache = { at: Date.now(), payload };
  // Record the latest count so the Overview can show a live ban total without re-scanning.
  try { await setConfig("bans_count", String(bans.length), "system"); await setConfig("bans_scanned_at", new Date().toISOString(), "system"); } catch {}
  return NextResponse.json(payload);
}

// A short human-readable case reference, e.g. RD-MSIQGE14-YHRWVP.
function newCaseId() {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = (n) => Array.from({ length: n }, () => A[Math.floor(Math.random() * A.length)]).join("");
  return `RD-${seg(8)}-${seg(6)}`;
}

async function headshotUrl(userId) {
  try {
    const r = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
    if (r.ok) { const d = await r.json(); return d?.data?.[0]?.imageUrl || null; }
  } catch {}
  return null;
}

export async function POST(req) {
  try {
    const s = await getSession();
    if (!s || !canBanS(s)) return forbidden();
    if (rateLimited(`post:${s.id}`, 15, 60_000)) return NextResponse.json({ error: "Slow down — too many actions." }, { status: 429 });

    // Accept either JSON (the usual path) or multipart/form-data (when the form attaches evidence files).
    let input, reason, duration, evidence, note, action = "ban", uploaded = [];
    if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
      const fd = await req.formData();
      input = fd.get("user"); reason = fd.get("reason"); duration = fd.get("duration");
      evidence = fd.get("evidence"); note = fd.get("note"); action = fd.get("action") || "ban";
      uploaded = fd.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
    } else {
      ({ user: input, reason, duration, evidence, note, action = "ban" } = await req.json());
    }
    const isBan = action === "ban";
    const actionLabel = action === "kick" ? "Kick" : action === "warn" ? "Warn" : isBan ? "Ban" : "Unban";
    const reasonText = String(reason || "").trim();
    const evidenceText = String(evidence || "").trim();
    const noteText = String(note || "").trim().slice(0, 500); // internal — never sent to the game reason
    if ((isBan || action === "warn") && !reasonText) return NextResponse.json({ error: `A reason is required to ${actionLabel.toLowerCase()}.` }, { status: 400 });

    // API key: the dedicated Bans key from Settings/env if set, else the main key.
    const { apiKey, universeId, banApiKey } = await getConfig();
    const banKey = banApiKey || apiKey;
    if (!banKey || !universeId) {
      return serverError("Ban not configured: set a Bans API key in Settings + a universe id.");
    }

    // Resolve once; retry once on a flaky/rate-limited lookup before giving up.
    let target = await resolveUsername(input).catch(() => null);
    if (!target) {
      await new Promise((r) => setTimeout(r, 400));
      target = await resolveUsername(input).catch(() => null);
    }
    if (!target) {
      // If the username lookup is still flaky, or it's a terminated account, fall back to a
      // numeric id — the frontend sends the already-resolved id, so a valid target NEVER fails
      // with "No such Roblox user". Applies to every action (ban/unban/kick/warn).
      const idOnly = String(input).trim();
      if (!/^\d+$/.test(idOnly)) return notFound("No such Roblox user.");
      const cached = nameCache.get(idOnly);
      target = { userId: idOnly, username: cached?.username || idOnly, displayName: cached?.displayName || cached?.username || idOnly };
    }

    let publishNote = "";
    if (action === "kick" || action === "warn") {
      // Neither kick nor warn is an Open Cloud restriction. We publish to a MessagingService
      // topic; a game-side listener acts on it (ModKick -> Player:Kick, ModWarn -> notify the
      // player). Needs the universe-messaging-service:publish scope + the in-game listener.
      const topic = action === "kick" ? "ModKick" : "ModWarn";
      const message = JSON.stringify({ userId: Number(target.userId), reason: reasonText, by: s.name });
      const kr = await fetch(`https://apis.roblox.com/messaging-service/v1/universes/${universeId}/topics/${topic}`, {
        method: "POST",
        headers: { "x-api-key": banKey, "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!kr.ok) {
        const detail = `Roblox ${kr.status}: ${(await kr.text()).slice(0, 250)}`;
        // A kick is only meaningful in-game, so a failed publish is a hard error. A warn is a
        // recorded action regardless, so we keep going and just note the delivery failure.
        if (action === "kick") return NextResponse.json({ error: `Kick publish failed — ${detail}` }, { status: 502 });
        publishNote = `in-game notice not delivered (${detail})`;
      }
    } else {
      const gameJoinRestriction = isBan
        ? {
            active: true,
            privateReason: reasonText,
            displayReason: reasonText,
            excludeAltAccounts: false,
            ...(duration ? { duration: /^\d+$/.test(String(duration)) ? `${duration}s` : String(duration) } : {}),
          }
        : { active: false };

      // Roblox rate-limits user-restriction writes per user/universe (429 RESOURCE_EXHAUSTED).
      // Auto-retry with backoff (honouring Retry-After) so a rate-limited ban/unban still goes
      // through once the window clears, instead of just failing.
      const url = `https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions/${target.userId}`;
      let res, lastBody = "";
      for (let attempt = 1; attempt <= 6; attempt++) {
        res = await fetch(url, {
          method: "PATCH",
          headers: { "x-api-key": banKey, "Content-Type": "application/json" },
          body: JSON.stringify({ gameJoinRestriction }),
        });
        if (res.ok) break;
        lastBody = (await res.text()).slice(0, 250);
        const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
        if (!retryable || attempt === 6) {
          return NextResponse.json({ error: `Roblox ${res.status}: ${lastBody}` }, { status: 502 });
        }
        const ra = Number(res.headers.get("retry-after"));
        const waitMs = ra > 0 ? Math.min(30000, ra * 1000) : Math.min(15000, 2000 * 2 ** (attempt - 1));
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    const caseId = newCaseId();

    // Webhook log embed — exact format: ## header, >>> blockquote, linked+code username,
    // code case id, avatar thumbnail, and a -# subtext line with a Discord timestamp.
    let webhook = "no BAN_WEBHOOK_URL set";
    const hook = process.env.BAN_WEBHOOK_URL;
    if (hook) {
      const thumb = await headshotUrl(target.userId);
      const unix = Math.floor(Date.now() / 1000);
      const profile = `https://www.roblox.com/users/${target.userId}/profile`;
      // Classic embed (no separator lines — those need Components V2 which webhooks reject).
      // Avatar on the right as the embed thumbnail; timestamp via <t:..:F>.
      const ev = evidenceParts(evidenceText);
      const description =
        `## ${target.displayName || target.username} (@${target.username})\n` +
        `> Username: [\`${target.username}\`](${profile})\n` +
        `> User ID: ${target.userId}\n` +
        `> Game: ${GAME_NAME}\n` +
        `> Reason: ${reasonText || "—"}\n` +
        (ev.line ? ev.line + "\n" : "") +
        (noteText ? `> Note: ${noteText}\n` : "") +
        `> case_id: \`${caseId}\`\n` +
        `> Moderator: ${s.name} (id: ${s.id})\n` +
        `-# Action taken on: <t:${unix}:F> - ${actionLabel}`;
      // Direct image evidence → inline preview in the embed; a clip/video link → message content so
      // Discord unfurls it into a player. Uploaded files are re-sent as attachments (embedded in the log).
      const embed = { description, ...(thumb ? { thumbnail: { url: thumb } } : {}), ...(ev.imageUrl ? { image: { url: ev.imageUrl } } : {}) };
      webhook = await sendBanWebhook(hook, { embed, contentUrl: ev.contentUrl, files: await prepareUploadedFiles(uploaded) });
    }

    await logAudit({
      actorId: s.id, actorName: s.name, action, category: "ban",
      target: `${target.username} (${target.userId})`, detail: `${reasonText || ""} [${caseId}]`.trim(),
    });

    if (action === "ban" || action === "unban") invalidateScan(); // active-ban set changed

    return NextResponse.json({ ok: true, action, user: target, caseId, webhook, note: publishNote || undefined });
  } catch (e) {
    console.error("[bans] POST failed:", e);
    return serverError("Action failed — see server logs.");
  }
}
