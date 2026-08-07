import { getSession } from "@/lib/session";
import { canBan } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { getConfig } from "@/lib/config";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Allow time to sit through a rate-limit window and retry (see the retry loop below).
export const maxDuration = 60;

const GAME_NAME = "Zee Hood Game";

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

    const { user: input, reason, duration, action = "ban" } = await req.json();
    const isBan = action !== "unban";
    const reasonText = String(reason || "").trim();
    if (isBan && !reasonText) return NextResponse.json({ error: "A reason is required to ban." }, { status: 400 });

    // API key: the dedicated Bans key from Settings/env if set, else the main key.
    const { apiKey, universeId, banApiKey } = await getConfig();
    const banKey = banApiKey || apiKey;
    if (!banKey || !universeId) {
      return NextResponse.json({ error: "Ban not configured: set a Bans API key in Settings + a universe id." }, { status: 500 });
    }

    const target = await resolveUsername(input);
    if (!target) return NextResponse.json({ error: "No such Roblox user." }, { status: 404 });

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

    const caseId = newCaseId();

    // Webhook log embed — exact format: ## header, >>> blockquote, linked+code username,
    // code case id, avatar thumbnail, and a -# subtext line with a Discord timestamp.
    const hook = process.env.BAN_WEBHOOK_URL;
    if (hook) {
      const thumb = await headshotUrl(target.userId);
      const unix = Math.floor(Date.now() / 1000);
      const profile = `https://www.roblox.com/users/${target.userId}/profile`;
      const description =
        `## ${target.displayName || target.username} (@${target.username})\n` +
        `> Username: [\`${target.username}\`](${profile})\n` +
        `> User ID: ${target.userId}\n` +
        `> Game: ${GAME_NAME}\n` +
        `> Reason: ${reasonText || "—"}\n` +
        `> case_id: \`${caseId}\`\n` +
        `> Moderator: ${s.name} (id: ${s.id})\n` +
        `-# ⏱️ Action taken on: <t:${unix}:F> - ${isBan ? "Ban" : "Unban"}`;
      const embed = { ...(thumb ? { thumbnail: { url: thumb } } : {}), description };
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      }).catch(() => {});
    }

    await logAudit({
      actorId: s.id, actorName: s.name, action: isBan ? "ban" : "unban", category: "ban",
      target: `${target.username} (${target.userId})`, detail: `${reasonText || ""} [${caseId}]`.trim(),
    });

    return NextResponse.json({ ok: true, action: isBan ? "ban" : "unban", user: target, caseId });
  } catch (e) {
    return NextResponse.json({ error: `Ban failed: ${e?.message || String(e)}` }, { status: 500 });
  }
}
