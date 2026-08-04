"use client";
import { useEffect, useState } from "react";

// Roblox retired the old headshot-thumbnail/image direct URL, and the Thumbnails API
// (which replaces it) returns JSON and blocks cross-origin browser calls — so we resolve
// image URLs through our own /api/avatars. Requests from every <Avatar> that mounts in the
// same tick are batched into ONE call, and results are cached for the session.
const cache = new Map(); // userId -> imageUrl
let queue = new Map(); // userId -> [resolve, ...]
let timer = null;

async function flush() {
  timer = null;
  const batch = queue;
  queue = new Map();
  const ids = [...batch.keys()];
  try {
    const r = await fetch(`/api/avatars?ids=${ids.join(",")}`);
    const d = r.ok ? await r.json() : {};
    for (const id of ids) {
      const url = d[id] || "";
      cache.set(id, url);
      (batch.get(id) || []).forEach((fn) => fn(url));
    }
  } catch {
    for (const id of ids) (batch.get(id) || []).forEach((fn) => fn(""));
  }
}
function resolveAvatar(userId) {
  return new Promise((resolve) => {
    if (cache.has(userId)) return resolve(cache.get(userId));
    if (!queue.has(userId)) queue.set(userId, []);
    queue.get(userId).push(resolve);
    if (!timer) timer = setTimeout(flush, 25);
  });
}

export default function Avatar({ userId, size = 32 }) {
  const [src, setSrc] = useState(() => cache.get(String(userId)) || "");
  useEffect(() => {
    let alive = true;
    if (userId) resolveAvatar(String(userId)).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [userId]);

  const base = { width: size, height: size, borderRadius: "50%", background: "var(--surface-3)", border: "1px solid var(--line)", flex: "0 0 auto", objectFit: "cover" };
  if (!userId) return null;
  return src
    ? <img src={src} alt="" width={size} height={size} loading="lazy" style={base} />
    : <span style={base} aria-hidden="true" />;
}
