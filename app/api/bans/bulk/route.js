import { getSession } from "@/lib/session";
import { canBulkBan } from "@/lib/permissions";
import { limited } from "@/lib/ratelimit";
import { resolveUsername } from "@/lib/roblox";
import { getConfig } from "@/lib/config";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// PATCH one user-restriction, retrying 429/5xx with jittered backoff.
async function setRestriction(url, key, gameJoinRestriction) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ gameJoinRestriction }),
    });
    if (res.ok) return;
    const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
    if (!retryable || attempt === 6) throw new Error(`Roblox ${res.status}`);
    const ra = Number(res.headers.get("retry-after"));
    const wait = ra > 0 ? Math.min(20000, ra * 1000) : Math.min(10000, 500 * 2 ** (attempt - 1)) + Math.random() * 400;
    await new Promise((r) => setTimeout(r, wait));
  }
}

// POST { users: string[] | "id, id, name…", action: "ban"|"unban", reason }
// Bulk-applies a ban/unban to a list of players. Server-side loop so it isn't blocked by the
// per-request rate limiter, and honours Roblox's write quota via per-item retry. Logs one audit
// entry (not one per user) and posts no per-user webhooks to avoid flooding the ban channel.
export async function POST(req) {
  const s = await getSession();
  if (!s || !canBulkBan(s.level)) return NextResponse.json({ error: "Bulk ban/unban is co owners+ only." }, { status: 403 });
  const capped = await limited(`bulkban:${s.id}`, { max: 10, windowSec: 60 }); if (capped) return capped;

  const { users, action = "ban", reason } = await req.json();
  const isBan = action === "ban";
  const reasonText = String(reason || "").trim();
  if (isBan && !reasonText) return NextResponse.json({ error: "A reason is required to ban." }, { status: 400 });

  const list = [...new Set((Array.isArray(users) ? users : String(users || "").split(/[\s,]+/)).map((u) => String(u).trim()).filter(Boolean))];
  if (!list.length) return NextResponse.json({ error: "No players provided." }, { status: 400 });
  if (list.length > 500) return NextResponse.json({ error: "Max 500 players at once." }, { status: 400 });

  const c = await getConfig();
  const key = c.banApiKey || c.apiKey;
  const universeId = c.universeId;
  if (!key || !universeId) return NextResponse.json({ error: "Bans not configured (API key + universe id)." }, { status: 500 });

  const gjr = isBan
    ? { active: true, privateReason: reasonText, displayReason: reasonText, excludeAltAccounts: false }
    : { active: false };

  let done = 0;
  const errors = [];
  for (const input of list) {
    try {
      let t = await resolveUsername(input).catch(() => null);
      if (!t) {
        const id = input.replace(/\D/g, "");
        if (!id) throw new Error("no such Roblox user");
        t = { userId: id };
      }
      await setRestriction(`https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions/${t.userId}`, key, gjr);
      done++;
    } catch (e) {
      errors.push(`${input}: ${e.message}`);
    }
  }

  await logAudit({
    actorId: s.id, actorName: s.name, action: isBan ? "ban" : "unban", category: "ban", itemKey: "bulk",
    target: `bulk ${action} — ${done}/${list.length} player(s)`, detail: reasonText || null,
  });

  return NextResponse.json({ ok: !errors.length, done, total: list.length, failed: errors.length, errors: errors.slice(0, 12) });
}
