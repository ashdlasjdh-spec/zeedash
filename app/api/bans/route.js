import { getSession } from "@/lib/session";
import { canBan } from "@/lib/permissions";
import { resolveUsername } from "@/lib/roblox";
import { getConfig } from "@/lib/config";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    const { user: input, duration, action = "ban" } = await req.json();
    const isBan = action !== "unban";
    const reason = "exp - zhd"; // every ban uses the standard reason

    // API key: the dedicated Bans key from Settings/env if set, else the main key.
    const { apiKey, universeId, banApiKey } = await getConfig();
    const banKey = banApiKey || apiKey;
    if (!banKey || !universeId) {
      return NextResponse.json({ error: "Ban not configured: set a Bans API key in Settings + a universe id." }, { status: 500 });
    }

    const target = await resolveUsername(input);
    if (!target) return NextResponse.json({ error: "No such Roblox user." }, { status: 404 });

    // Build the game-join restriction (Open Cloud v2 user-restrictions).
    const gameJoinRestriction = isBan
      ? {
          active: true,
          privateReason: String(reason || "No reason provided").slice(0, 999),
          displayReason: String(reason || "You have been banned from this experience.").slice(0, 399),
          excludeAltAccounts: false,
          ...(duration ? { duration: /^\d+$/.test(String(duration)) ? `${duration}s` : String(duration) } : {}),
        }
      : { active: false };

    const url = `https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions/${target.userId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "x-api-key": banKey, "Content-Type": "application/json" },
      body: JSON.stringify({ gameJoinRestriction }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 250);
      return NextResponse.json({ error: `Roblox ${res.status}: ${body}` }, { status: 500 });
    }

    const caseId = newCaseId();

    // Webhook log embed (matches the ban-log format).
    const hook = process.env.BAN_WEBHOOK_URL;
    if (hook) {
      const thumb = await headshotUrl(target.userId);
      const when = new Date().toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      const embed = {
        title: `${target.displayName || target.username} (@${target.username})`,
        color: isBan ? 0xe74c3c : 0x2ecc71,
        ...(thumb ? { thumbnail: { url: thumb } } : {}),
        fields: [
          { name: "Username", value: String(target.username) },
          { name: "User ID", value: String(target.userId) },
          { name: "Game", value: GAME_NAME },
          { name: "Reason", value: String(reason || "—") },
          { name: "case_id", value: caseId },
          { name: "Moderator", value: `${s.name} (id: ${s.id})` },
        ],
        footer: { text: `Action taken on: ${when} - ${isBan ? "Ban" : "Unban"}` },
      };
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      }).catch(() => {});
    }

    await logAudit({
      actorId: s.id, actorName: s.name, action: isBan ? "ban" : "unban", category: "ban",
      target: `${target.username} (${target.userId})`, detail: `${reason || ""}${isBan ? ` [${caseId}]` : ""}`.trim(),
    });

    return NextResponse.json({ ok: true, action: isBan ? "ban" : "unban", user: target, caseId: isBan ? caseId : null });
  } catch (e) {
    return NextResponse.json({ error: `Ban failed: ${e?.message || String(e)}` }, { status: 500 });
  }
}
