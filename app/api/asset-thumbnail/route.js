import { rateLimit, clientIp } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Resolve a Roblox asset's image URL via the Thumbnails API (server-side — the direct
// asset-thumbnail/image URL is retired and the API blocks cross-origin browser calls).
// Used by the crew-tag live preview (dashboard AND the public /preview tool) to show a decal icon —
// it only returns PUBLIC Roblox thumbnail URLs, so it's open, with a per-IP rate limit to prevent
// someone hammering the upstream Roblox API. Cached 1h.
const cache = new Map(); // assetId -> { url, at }
const TTL = 60 * 60 * 1000;

export async function GET(req) {
  const rl = await rateLimit(`assetthumb:${clientIp(req)}`, { max: 60, windowSec: 60 });
  if (!rl.ok) return NextResponse.json({ url: "" }, { status: 429, headers: { "retry-after": "20" } });
  const id = (new URL(req.url).searchParams.get("id") || "").match(/\d+/)?.[0];
  if (!id) return NextResponse.json({ url: "" });

  const c = cache.get(id);
  if (c && Date.now() - c.at < TTL) return NextResponse.json({ url: c.url });

  let url = "";
  // Freshly uploaded decals return state "Pending" until Roblox generates the thumbnail,
  // so poll a few times before giving up. This is why just-uploaded icons showed blank.
  for (let attempt = 0; attempt < 6 && !url; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1200));
    try {
      const r = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${id}&size=150x150&format=Png&isCircular=false`);
      if (r.ok) {
        const d = await r.json();
        const item = (d.data || [])[0];
        if (item && item.state === "Completed" && item.imageUrl) { url = item.imageUrl; break; }
        // if Pending/Blocked, keep polling (Pending) or stop (Blocked/Error)
        if (item && (item.state === "Blocked" || item.state === "Error")) break;
      }
    } catch { /* keep trying */ }
  }

  if (url) cache.set(id, { url, at: Date.now() });
  return NextResponse.json({ url });
}
