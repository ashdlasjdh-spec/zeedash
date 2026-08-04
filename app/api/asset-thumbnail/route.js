import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Resolve a Roblox asset's image URL via the Thumbnails API (server-side — the direct
// asset-thumbnail/image URL is retired and the API blocks cross-origin browser calls).
// Used by the crew-tag live preview to show the uploaded decal icon. Cached 1h.
const cache = new Map(); // assetId -> { url, at }
const TTL = 60 * 60 * 1000;

export async function GET(req) {
  if (!(await getSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = (new URL(req.url).searchParams.get("id") || "").match(/\d+/)?.[0];
  if (!id) return NextResponse.json({ url: "" });

  const c = cache.get(id);
  if (c && Date.now() - c.at < TTL) return NextResponse.json({ url: c.url });

  let url = "";
  try {
    const r = await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${id}&size=150x150&format=Png&isCircular=false`);
    if (r.ok) {
      const d = await r.json();
      const item = (d.data || [])[0];
      if (item && item.state === "Completed" && item.imageUrl) url = item.imageUrl;
    }
  } catch { /* best-effort */ }

  if (url) cache.set(id, { url, at: Date.now() });
  return NextResponse.json({ url });
}
