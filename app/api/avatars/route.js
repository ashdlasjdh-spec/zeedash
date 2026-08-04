import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Resolve Roblox headshot image URLs for a batch of userIds via the Thumbnails API
// (server-side, so no CORS problem), returning { [userId]: imageUrl }. Cached for an hour
// since avatars rarely change and this is hit on every list load.
const cache = new Map(); // userId -> { url, at }
const TTL = 60 * 60 * 1000;

export async function GET(req) {
  if (!(await getSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const ids = (new URL(req.url).searchParams.get("ids") || "")
    .split(",").map((s) => s.trim()).filter((s) => /^\d+$/.test(s)).slice(0, 100);

  const out = {};
  const need = [];
  const now = Date.now();
  for (const id of ids) {
    const c = cache.get(id);
    if (c && now - c.at < TTL) out[id] = c.url;
    else need.push(id);
  }

  if (need.length) {
    try {
      const r = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${need.join(",")}&size=48x48&format=Png&isCircular=false`
      );
      if (r.ok) {
        const d = await r.json();
        for (const item of d.data || []) {
          const id = String(item.targetId);
          const url = item.state === "Completed" && item.imageUrl ? item.imageUrl : "";
          out[id] = url;
          if (url) cache.set(id, { url, at: now });
        }
      }
    } catch { /* best-effort — blanks just show the placeholder circle */ }
  }

  return NextResponse.json(out);
}
