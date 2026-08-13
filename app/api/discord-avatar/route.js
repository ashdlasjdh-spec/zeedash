import { getSession } from "@/lib/session";
import { kvMGetJSON, kvSetJSON } from "@/lib/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Resolve Discord user avatars by id (for the activity feed). The audit log only stores the actor's
// Discord id, so we look each one up via the bot token and return a CDN URL. Cached per-process AND
// cross-instance (Redis, ~6h) so Vercel's instances hit Discord's rate-limited users API at most once
// per user per window between them all.
const cache = new Map(); // id -> { url, at }
const TTL = 6 * 3600 * 1000;

export async function GET(req) {
  if (!(await getSession())) return NextResponse.json({}, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter((s) => /^\d{5,}$/.test(s)).slice(0, 50);
  const out = {};

  // 1) in-memory tier
  const miss = [];
  for (const id of ids) {
    const c = cache.get(id);
    if (c && Date.now() - c.at < TTL) out[id] = c.url; else miss.push(id);
  }
  // 2) shared Redis tier (one MGET for all misses)
  const stillMiss = [];
  if (miss.length) {
    const shared = await kvMGetJSON(miss.map((id) => `davatar:${id}`));
    miss.forEach((id, i) => {
      const rv = shared[i];
      if (rv && typeof rv.url === "string" && Number.isFinite(rv.at) && Date.now() - rv.at < TTL) {
        cache.set(id, { url: rv.url, at: rv.at }); out[id] = rv.url;
      } else stillMiss.push(id);
    });
  }
  // 3) resolve the true misses from Discord, then write both tiers (only successful lookups are cached)
  for (const id of stillMiss) {
    let url = "";
    if (token) {
      try {
        const r = await fetch(`https://discord.com/api/users/${id}`, { headers: { Authorization: `Bot ${token}` } });
        if (r.ok) {
          const d = await r.json();
          url = d.avatar
            ? `https://cdn.discordapp.com/avatars/${id}/${d.avatar}.png?size=64`
            : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`; // default avatar
        }
      } catch {}
    }
    const at = Date.now();
    cache.set(id, { url, at });
    if (url) kvSetJSON(`davatar:${id}`, { url, at }, 6 * 3600); // don't cache a failed lookup cross-instance
    out[id] = url;
  }
  return NextResponse.json(out);
}
