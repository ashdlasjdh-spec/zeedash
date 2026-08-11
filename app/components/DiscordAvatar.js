"use client";
import { useEffect, useState } from "react";

// Discord avatar for an audit actor. Resolves through /api/discord-avatar (bot token, cached
// server-side); requests are batched per tick and cached for the session. Falls back to the
// actor's initials when there's no id/avatar (e.g. system "Auto-expire" rows).
const cache = new Map();
let queue = new Map();
let timer = null;
async function flush() {
  timer = null;
  const batch = queue; queue = new Map();
  const ids = [...batch.keys()];
  try {
    const r = await fetch(`/api/discord-avatar?ids=${ids.join(",")}`);
    const d = r.ok ? await r.json() : {};
    for (const id of ids) { const u = d[id] || ""; cache.set(id, u); (batch.get(id) || []).forEach((fn) => fn(u)); }
  } catch {
    for (const id of ids) (batch.get(id) || []).forEach((fn) => fn(""));
  }
}
function resolve(id) {
  return new Promise((res) => {
    if (cache.has(id)) return res(cache.get(id));
    if (!queue.has(id)) queue.set(id, []);
    queue.get(id).push(res);
    if (!timer) timer = setTimeout(flush, 25);
  });
}

export default function DiscordAvatar({ actorId, name, size = 32 }) {
  const valid = actorId && /^\d{5,}$/.test(String(actorId));
  const [src, setSrc] = useState(() => (valid ? cache.get(String(actorId)) || "" : ""));
  useEffect(() => {
    let alive = true;
    if (valid) resolve(String(actorId)).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [actorId, valid]);

  const initials = (name || "?").trim().slice(0, 2).toUpperCase();
  const box = { width: size, height: size, borderRadius: 9, flex: "0 0 auto" };
  if (src) return <img src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" style={{ ...box, objectFit: "cover", background: "var(--surface-3)", border: "1px solid var(--line)" }} />;
  return <div className="ov-av" style={box}>{initials}</div>;
}
