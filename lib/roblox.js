import { getConfig } from "./config";

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
export async function resolveUsername(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  // Pull an id out of a profile URL if one was pasted.
  const urlId = raw.match(/roblox\.com\/users\/(\d+)/i)?.[1];
  const id = urlId || (/^\d+$/.test(raw) ? raw : null);

  if (id) {
    const res = await fetch(`https://users.roblox.com/v1/users/${id}`);
    if (res.ok) {
      const u = await res.json();
      if (u && u.id) return { userId: u.id, username: u.name, displayName: u.displayName };
    }
    // If it wasn't a real id and the raw wasn't a URL, fall through and try it as a name.
    if (urlId || /^\d+$/.test(raw)) return null;
  }

  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [raw], excludeBannedUsers: false }),
  });
  if (!res.ok) throw new Error("Could not reach Roblox user API");
  const data = await res.json();
  const u = data?.data?.[0];
  if (!u) return null;
  return { userId: u.id, username: u.name, displayName: u.displayName };
}

// ---- Open Cloud DataStore (for crew tags + custom emojis) ----
async function ds(datastore, entryKey, { method = "GET", body } = {}) {
  const { apiKey, universeId } = await getConfig();
  if (!apiKey || !universeId) throw new Error("Open Cloud not configured.");
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
      throw new Error(`DataStore ${res.status}: ${(await res.text()).slice(0, 150)}`);
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
