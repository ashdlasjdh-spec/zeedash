import { getConfig } from "./config";
import { query } from "./db";

// Open Cloud client. All grants leave the dashboard through here.
// Publishes to the in-game MessagingService topic "DashboardGrant" (and reuses the
// existing "PerkGrant" topic for perks). Also resolves usernames -> userIds.

async function oc(path, { method = "GET", body } = {}) {
  const { apiKey, universeId } = await getConfig();
  if (!apiKey || !universeId) throw new Error("Open Cloud not configured (set API key + universe id in Settings).");
  const url = `https://apis.roblox.com/messaging-service/v1/universes/${universeId}${path}`;
  const res = await fetch(url, {
    method,
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Open Cloud ${res.status}: ${t.slice(0, 200)}`);
  }
  return res;
}

// Publish a message to an in-game MessagingService topic.
export async function publish(topic, message) {
  return oc(`/topics/${encodeURIComponent(topic)}`, {
    method: "POST",
    body: { message: JSON.stringify(message) },
  });
}

// Resolve a Roblox username OR a numeric userId to a full user (public API, no key
// needed). Accepts "Builderman", "156", or a full profile URL — so staff can paste
// whatever they have. A pure-numeric input is treated as a userId first.
// fetch that retries Roblox 429 / 5xx with SHORT jittered backoff. Kept snappy (worst case ~2.5s)
// so "resolve as you type" never hangs on Searching…; the DB cache absorbs repeat lookups.
async function robloxFetch(url, opts, tries = 3) {
  for (let a = 1; a <= tries; a++) {
    let res;
    try { res = await fetch(url, opts); } catch { if (a === tries) return null; await new Promise((r) => setTimeout(r, 250 * a)); continue; }
    if (res.ok || (res.status !== 429 && res.status < 500)) return res; // ok or non-retryable
    if (a === tries) return res;
    const ra = Number(res.headers.get("retry-after"));
    const wait = ra > 0 ? Math.min(1500, ra * 1000) : Math.min(900, 250 * a) * (0.7 + Math.random() * 0.6);
    await new Promise((r) => setTimeout(r, wait));
  }
  return null;
}

const CACHE_TTL_MS = 7 * 24 * 3600 * 1000; // usernames rarely change; 7-day freshness
async function cacheById(id) {
  try {
    const r = await query("select user_id, username, display_name, updated_at from roblox_users where user_id = $1", [id]);
    const row = r[0]; if (row && Date.now() - new Date(row.updated_at).getTime() < CACHE_TTL_MS) return { userId: Number(row.user_id), username: row.username, displayName: row.display_name };
  } catch {}
  return null;
}
async function cacheByName(name) {
  try {
    const r = await query("select user_id, username, display_name, updated_at from roblox_users where lower(username) = lower($1)", [name]);
    const row = r[0]; if (row && Date.now() - new Date(row.updated_at).getTime() < CACHE_TTL_MS) return { userId: Number(row.user_id), username: row.username, displayName: row.display_name };
  } catch {}
  return null;
}
export async function cachePut(u) {
  if (!u?.userId) return;
  try {
    await query(
      `insert into roblox_users (user_id, username, display_name, updated_at) values ($1,$2,$3, now())
       on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name, updated_at = now()`,
      [u.userId, u.username || null, u.displayName || u.username || null],
    );
  } catch {}
}
// Read many ids from the cache at once (used by the ban-list render). Returns Map(idStr -> {username,displayName}).
export async function cacheGetMany(ids) {
  const out = new Map();
  if (!ids.length) return out;
  try {
    const r = await query("select user_id, username, display_name from roblox_users where user_id = any($1::bigint[])", [ids.map(Number).filter(Boolean)]);
    for (const row of r) out.set(String(row.user_id), { username: row.username, displayName: row.display_name });
  } catch {}
  return out;
}

export async function resolveUsername(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  // Pull an id out of a profile URL if one was pasted.
  const urlId = raw.match(/roblox\.com\/users\/(\d+)/i)?.[1];
  const id = urlId || (/^\d+$/.test(raw) ? raw : null);

  if (id) {
    const cached = await cacheById(Number(id)); if (cached) return cached;
    const res = await robloxFetch(`https://users.roblox.com/v1/users/${id}`);
    if (res && res.ok) {
      const u = await res.json();
      if (u && u.id) { const val = { userId: u.id, username: u.name, displayName: u.displayName }; cachePut(val); return val; }
    }
    // If it wasn't a real id and the raw wasn't a URL, fall through and try it as a name.
    if (urlId || /^\d+$/.test(raw)) return null;
  }

  const cachedName = await cacheByName(raw); if (cachedName) return cachedName;
  const res = await robloxFetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [raw], excludeBannedUsers: false }),
  });
  if (!res || !res.ok) throw new Error("Roblox is rate-limiting name lookups right now — try again in a moment.");
  const data = await res.json();
  const u = data?.data?.[0];
  if (!u) return null;
  const val = { userId: u.id, username: u.name, displayName: u.displayName };
  cachePut(val);
  return val;
}

// ---- Open Cloud DataStore (for crew tags + custom emojis) ----
async function ds(datastore, entryKey, { method = "GET", body } = {}) {
  const { apiKey, universeId } = await getConfig();
  if (!apiKey || !universeId) throw new Error("Open Cloud not configured — set the Roblox API key + universe id in Settings.");
  // The universe id goes into the URL PATH unencoded, so a non-numeric value (stray space, a place id
  // pasted by mistake, letters) makes Roblox 400 with "The string did not match the expected pattern."
  // Catch it here with a message that actually says what's wrong.
  if (!/^\d+$/.test(String(universeId))) {
    throw new Error(`Roblox universe id is invalid ("${String(universeId).slice(0, 24)}") — it must be the numeric UNIVERSE id (not a place id). Fix it in Settings.`);
  }
  const url = `https://apis.roblox.com/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry`
    + `?datastoreName=${encodeURIComponent(datastore)}&entryKey=${encodeURIComponent(entryKey)}`;

  // Open Cloud rate-limits (~429) and occasionally 5xx. Without retry a rate-limited request
  // is lost, which during a bulk sync means that user is silently dropped. Retry a few times
  // with backoff (honouring Retry-After when present) so transient limits don't leave gaps.
  const MAX_TRIES = 8;
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const res = await fetch(url, {
      method,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (method === "GET" && res.status === 404) return null;
    if (res.ok) return method === "GET" ? res.json() : true;

    // Retry on 429 (rate limit) and 5xx (transient). Everything else fails immediately.
    const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
    if (!retryable || attempt === MAX_TRIES) {
      // Name the operation + include Roblox's full message so an opaque validation error
      // ("The string did not match the expected pattern.") points at what actually failed.
      const detail = (await res.text().catch(() => "")).slice(0, 220) || res.statusText;
      const hint = res.status === 401 || res.status === 403
        ? " — the Open Cloud API key is invalid or lacks WRITE access to this datastore. Regenerate it in the Roblox Creator Dashboard with DataStore read+write for this experience."
        : "";
      throw new Error(`DataStore ${method} ${datastore}/${entryKey} → ${res.status}: ${detail}${hint}`);
    }
    // Honour Retry-After; otherwise exponential backoff WITH JITTER so a wave of concurrent
    // requests that all 429 together don't retry in lockstep and re-hit the quota at once.
    const retryAfter = Number(res.headers.get("retry-after"));
    const base = Math.min(12000, 500 * 2 ** (attempt - 1));
    const waitMs = retryAfter > 0 ? retryAfter * 1000 + Math.random() * 500 : Math.round(base * (0.6 + Math.random() * 0.8));
    await new Promise((r) => setTimeout(r, waitMs));
  }
}
export async function dsGet(datastore, key) { return ds(datastore, key, { method: "GET" }); }
export async function dsSet(datastore, key, value) { return ds(datastore, key, { method: "POST", body: value }); }
