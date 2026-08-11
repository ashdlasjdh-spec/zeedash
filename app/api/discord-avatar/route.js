import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Resolve Discord user avatars by id (for the activity feed). The audit log only stores the
// actor's Discord id, so we look each one up via the bot token and return a CDN URL. Cached
// per-process for 6h so we hit Discord at most once per user per window.
const cache = new Map(); // id -> { url, at }
const TTL = 6 * 3600 * 1000;

export async function GET(req) {
  if (!(await getSession())) return NextResponse.json({}, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter((s) => /^\d{5,}$/.test(s)).slice(0, 50);
  const out = {};
  for (const id of ids) {
    const c = cache.get(id);
    if (c && Date.now() - c.at < TTL) { out[id] = c.url; continue; }
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
    cache.set(id, { url, at: Date.now() });
    out[id] = url;
  }
  return NextResponse.json(out);
}
