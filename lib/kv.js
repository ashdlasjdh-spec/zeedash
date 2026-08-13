// Tiny cross-instance cache over Upstash Redis's REST API (plain fetch — no client dependency, Node or
// Edge). Used to SHARE the resolved session bits (permission level, scoped-group access, per-guild
// grants) between serverless instances, so a cold instance reads a warm value from Redis instead of
// re-hitting Discord — fewer Discord API calls (rate-limit headroom) and faster cold starts.
//
// It is a pure ADDITIVE cache: every function fails open (get → null, set → silent), so if Upstash is
// unconfigured or down, callers fall straight through to their existing in-memory + source logic and
// behave exactly as before. Same env vars as lib/ratelimit.js.
const REST_URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").replace(/\/$/, "");
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
export const kvEnabled = !!(REST_URL && REST_TOKEN);

async function cmd(args, timeoutMs = 700) {
  if (!kvEnabled) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs); // never hang a request on the cache
  try {
    const res = await fetch(REST_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && "result" in data ? data.result : null;
  } catch {
    return null; // fail open on error / timeout
  } finally {
    clearTimeout(t);
  }
}

// Read a JSON value, or null on miss / any error.
export async function kvGetJSON(key) {
  const v = await cmd(["GET", key]);
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return null; }
}

// Read many JSON values in ONE round-trip (MGET). Returns an array aligned to `keys`; each entry is
// the parsed value or null (miss / error). Fail-open.
export async function kvMGetJSON(keys) {
  if (!keys.length) return [];
  const v = await cmd(["MGET", ...keys]);
  if (!Array.isArray(v)) return keys.map(() => null);
  return v.map((s) => { if (s == null) return null; try { return JSON.parse(s); } catch { return null; } });
}

// Best-effort write with a TTL (seconds). Never throws.
export function kvSetJSON(key, value, ttlSec) {
  const ttl = Math.max(1, Math.floor(ttlSec) || 1);
  return cmd(["SET", key, JSON.stringify(value), "EX", String(ttl)]).catch(() => null);
}
