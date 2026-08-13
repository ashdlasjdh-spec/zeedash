// Distributed rate limiting via Upstash Redis's REST API — plain fetch(), so there is NO client
// dependency (no package-lock change) and it runs the same on Node or Edge. It is completely INERT
// until the Upstash env vars are present, so shipping it changes nothing until you turn it on, and it
// FAILS OPEN on any error or timeout, so the limiter can never take the site down. Fixed-window counter.
//
// Env vars (either naming works — Vercel's Storage → Upstash integration injects the KV_* pair for you):
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   (direct from upstash.com)
//   KV_REST_API_URL        / KV_REST_API_TOKEN          (Vercel Storage → Upstash Redis, auto-injected)
const REST_URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").replace(/\/$/, "");
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
export const rateLimitEnabled = !!(REST_URL && REST_TOKEN);

// The caller's IP behind Vercel's proxy.
export function clientIp(req) {
  const h = req.headers;
  return (h.get("x-forwarded-for") || h.get("x-real-ip") || "unknown").split(",")[0].trim();
}

// Fixed-window limit for `key`. Returns { ok, remaining, count }; ok=false means over the limit.
export async function rateLimit(key, { max = 30, windowSec = 60 } = {}) {
  if (!rateLimitEnabled) return { ok: true, remaining: max, count: 0 }; // not configured — no-op
  const bucket = `rl:${key}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 800); // never hang a request waiting on the limiter
  try {
    // Atomic: bump the counter, and start the window's TTL only on the first hit (EXPIRE … NX).
    const res = await fetch(`${REST_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", bucket], ["EXPIRE", bucket, windowSec, "NX"]]),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return { ok: true, remaining: max, count: 0 }; // fail open
    const data = await res.json();
    const count = Number(Array.isArray(data) ? data[0]?.result : data?.result) || 0;
    return { ok: count <= max, remaining: Math.max(0, max - count), count };
  } catch {
    return { ok: true, remaining: max, count: 0 }; // fail open on error / timeout
  } finally {
    clearTimeout(timer);
  }
}
