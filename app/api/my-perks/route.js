import { resolveUsername } from "@/lib/roblox";
import { listPerks, listEmojis } from "@/lib/perksApi";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { NextResponse } from "next/server";
import { badRequest, notFound } from "@/lib/api";

export const dynamic = "force-dynamic";

// Public "check my perks" lookup — a player types their Roblox username and sees ONLY their own
// perks + emoji (which they can already see in-game, so nothing secret). The perks-api key stays
// server-side; we load the full list once and cache it per-instance (60s) so a lookup doesn't hammer
// the perks-api, and we return just the one matching user. Rate-limited per IP.
let perksCache = { at: 0, data: null };
async function getAllPerks() {
  if (perksCache.data && Date.now() - perksCache.at < 60000) return perksCache.data;
  try { const d = await listPerks(); perksCache = { at: Date.now(), data: d?.perks || [] }; } catch { /* keep last */ }
  return perksCache.data || [];
}

export async function GET(req) {
  const rl = await rateLimit(`myperks:${clientIp(req)}`, { max: 30, windowSec: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Slow down — try again in a moment." }, { status: 429, headers: { "retry-after": "20" } });

  const username = (new URL(req.url).searchParams.get("u") || "").trim();
  if (!username) return badRequest("Enter a Roblox username.");

  const u = await resolveUsername(username).catch(() => null);
  if (!u || !u.userId) return notFound("That Roblox user wasn't found.");
  const id = String(u.userId);

  const all = await getAllPerks();
  const entry = (Array.isArray(all) ? all : []).find((p) => String(p.userId) === id) || null;

  // Normalise whatever fields the entry has into { category: [items] }, robust to unknown field names.
  const perks = {};
  if (entry) {
    for (const [k, v] of Object.entries(entry)) {
      if (k === "userId" || k === "id" || v == null) continue;
      if (Array.isArray(v)) { if (v.length) perks[k] = v.map(String); }
      else if (typeof v === "string") { if (v) perks[k] = [v]; }
      else if (v === true) perks[k] = ["✓"];
    }
  }

  let emoji = "";
  try { const e = await listEmojis(); emoji = e?.emojis?.[id] || ""; } catch { /* emojis optional */ }

  return NextResponse.json(
    { username: u.username || username, userId: u.userId, perks, emoji, has: Object.keys(perks).length > 0 || !!emoji },
    { headers: { "cache-control": "no-store" } },
  );
}
