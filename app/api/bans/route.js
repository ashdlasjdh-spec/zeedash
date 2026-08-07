import { getSession } from "@/lib/session";
import { canBan } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { getConfig } from "@/lib/config";
import { logAudit, query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Allow time to sit through a rate-limit window and retry (see the retry loop below).
export const maxDuration = 60;

const GAME_NAME = "Zee Hood Game";

function banConfig(c) {
  const key = c.banApiKey || c.apiKey;
  return { key, universeId: c.universeId };
}

// GET /api/bans          -> scan every ACTIVE game ban (live from Open Cloud)
// GET /api/bans?user=X   -> resolve one target (avatar, id, ban status, history)
export async function GET(req) {
  const s = await getSession();
  if (!s || !canBan(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { key, universeId } = banConfig(await getConfig());
  if (!key || !universeId) return NextResponse.json({ error: "Bans not configured (API key + universe id)." }, { status: 500 });

  let user = req.nextUrl.searchParams.get("user");
  const caseId = req.nextUrl.searchParams.get("case");
  const full = req.nextUrl.searchParams.get("full") === "1" || !!caseId; // case lookup always full

  // ---- case-id lookup: find the audit entry, pull its user id, then look up ----
  if (caseId && !user) {
    let row;
    try { const rows = await query("select target from audit_log where category='ban' and detail like $1 order by created_at desc limit 1", [`%[${caseId}]%`]); row = rows[0]; } catch {}
    if (!row) return NextResponse.json({ error: "No case with that id." }, { status: 404 });
    user = (String(row.target).match(/\((\d+)\)/) || [])[1];
    if (!user) return NextResponse.json({ error: "That case has no user id." }, { status: 404 });
  }

  // ---- single-target lookup (live resolve while typing / full lookup page) ----
  if (user) {
    const t = await resolveUsername(user);
    if (!t) return NextResponse.json({ error: "No such Roblox user." }, { status: 404 });
    let active = false, reason = "", duration = null, startTime = null;
    try {
      const r = await fetch(`https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions/${t.userId}`, { headers: { "x-api-key": key } });
      if (r.ok) { const d = await r.json(); const g = d.gameJoinRestriction || {}; active = !!g.active; reason = g.displayReason || g.privateReason || ""; duration = g.duration || null; startTime = g.startTime || null; }
    } catch {}
    let history = [];
    try {
      history = await query(
        "select action, detail, actor_name, actor_id, created_at from audit_log where category='ban' and target like $1 order by created_at desc limit 100",
        [`%(${t.userId})%`],
      );
    } catch {}
    const thumb = await headshotUrl(t.userId);
    const u = { userId: String(t.userId), username: t.username, displayName: t.displayName || t.username, avatar: thumb, active, reason, duration, startTime, historyCount: history.length };
    return NextResponse.json(full ? { user: u, history } : { user: u });
  }

  // ---- full scan of active bans (paginate the restriction list) ----
  const active = [];
  let pageToken = "";
  try {
    for (let i = 0; i < 40; i++) {
      const url = `https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions?maxPageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
      const r = await fetch(url, { headers: { "x-api-key": key } });
      if (!r.ok) return NextResponse.json({ error: `Roblox ${r.status}: ${(await r.text()).slice(0, 200)}` }, { status: 502 });
      const d = await r.json();
      for (const ur of d.userRestrictions || []) {
        const g = ur.gameJoinRestriction || {};
        if (g.active) active.push({ userId: String(ur.user || "").split("/").pop(), reason: g.displayReason || g.privateReason || "", startTime: g.startTime || null, duration: g.duration || null });
      }
      pageToken = d.nextPageToken || "";
      if (!pageToken) break;
    }
  } catch (e) {
    return NextResponse.json({ error: `Scan failed: ${e.message}` }, { status: 500 });
  }

  // resolve usernames (batch 100)
  const ids = active.map((a) => Number(a.userId)).filter(Boolean);
  const info = {};
  for (let i = 0; i < ids.length; i += 100) {
    try {
      const r = await fetch("https://users.roblox.com/v1/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: ids.slice(i, i + 100), excludeBannedUsers: false }) });
      if (r.ok) { const d = await r.json(); for (const u of d.data || []) info[u.id] = { username: u.name, displayName: u.displayName }; }
    } catch {}
  }
  const bans = active.map((a) => ({ ...a, username: info[a.userId]?.username || a.userId, displayName: info[a.userId]?.displayName || info[a.userId]?.username || a.userId }));
  return NextResponse.json({ scope: GAME_NAME, count: bans.length, bans });
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
    if (!s || !canBan(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { user: input, reason, duration, evidence, action = "ban" } = await req.json();
    const isBan = action === "ban";
    const actionLabel = action === "kick" ? "Kick" : isBan ? "Ban" : "Unban";
    const reasonText = String(reason || "").trim();
    const evidenceText = String(evidence || "").trim();
    if (isBan && !reasonText) return NextResponse.json({ error: "A reason is required to ban." }, { status: 400 });

    // API key: the dedicated Bans key from Settings/env if set, else the main key.
    const { apiKey, universeId, banApiKey } = await getConfig();
    const banKey = banApiKey || apiKey;
    if (!banKey || !universeId) {
      return NextResponse.json({ error: "Ban not configured: set a Bans API key in Settings + a universe id." }, { status: 500 });
    }

    const target = await resolveUsername(input);
    if (!target) return NextResponse.json({ error: "No such Roblox user." }, { status: 404 });

    if (action === "kick") {
      // There is no Open Cloud "kick" endpoint — a kick only affects someone already in a
      // running server. We publish to a MessagingService topic ("ModKick"); a game-side script
      // subscribed to it reads the payload and calls Player:Kick(). This needs the
      // universe-messaging-service:publish scope on the key, plus the in-game listener.
      const message = JSON.stringify({ userId: Number(target.userId), reason: reasonText, by: s.name });
      const kr = await fetch(`https://apis.roblox.com/messaging-service/v1/universes/${universeId}/topics/ModKick`, {
        method: "POST",
        headers: { "x-api-key": banKey, "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!kr.ok) {
        return NextResponse.json({ error: `Kick publish failed — Roblox ${kr.status}: ${(await kr.text()).slice(0, 250)}` }, { status: 502 });
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
      const description =
        `## ${target.displayName || target.username} (@${target.username})\n` +
        `> Username: [\`${target.username}\`](${profile})\n` +
        `> User ID: ${target.userId}\n` +
        `> Game: ${GAME_NAME}\n` +
        `> Reason: ${reasonText || "—"}\n` +
        (evidenceText ? `> Evidence: ${evidenceText}\n` : "") +
        `> case_id: \`${caseId}\`\n` +
        `> Moderator: ${s.name} (id: ${s.id})\n` +
        `-# ⏱️ Action taken on: <t:${unix}:F> - ${actionLabel}`;
      const embed = { description, ...(thumb ? { thumbnail: { url: thumb } } : {}) };
      const payload = { embeds: [embed], allowed_mentions: { parse: [] } };
      try {
        const wr = await fetch(hook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        webhook = wr.ok ? "sent" : `webhook ${wr.status}: ${(await wr.text()).slice(0, 300)}`;
      } catch (e) {
        webhook = `webhook error: ${e.message}`;
      }
    }

    await logAudit({
      actorId: s.id, actorName: s.name, action, category: "ban",
      target: `${target.username} (${target.userId})`, detail: `${reasonText || ""} [${caseId}]`.trim(),
    });

    return NextResponse.json({ ok: true, action, user: target, caseId, webhook });
  } catch (e) {
    return NextResponse.json({ error: `Ban failed: ${e?.message || String(e)}` }, { status: 500 });
  }
}
