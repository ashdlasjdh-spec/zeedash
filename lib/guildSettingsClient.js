"use client";
// Client-side stale-while-revalidate cache for /api/guild-settings.
//
// Every Server-tab page (FeatureSettings, FeatureList) fetches the SAME full
// settings blob for the selected guild and just reads its own feature out of it.
// Fetching that blob fresh on every page mount is what makes the content "take a
// bit to load" when hopping between features. This caches the blob per guild so
// the first Server-tab page pays the round-trip (with a skeleton) and every one
// after it renders instantly from cache, while a background refetch keeps it fresh.
const cache = new Map(); // guild -> { data, at }
const inflight = new Map(); // guild -> Promise
const TTL_MS = 15_000;

// Synchronously return the cached settings blob for a guild, or null.
export function cachedGuildSettings(guild) {
  return (guild && cache.get(guild)?.data) || null;
}

// Fetch (or reuse) the settings blob for a guild. Fresh cache hits skip the
// network entirely; otherwise the in-flight request is de-duped so N features
// mounting at once share one request.
export async function loadGuildSettings(guild, { force = false } = {}) {
  if (!guild) return {};
  const hit = cache.get(guild);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.data;
  if (!force && inflight.has(guild)) return inflight.get(guild);
  const p = fetch(`/api/guild-settings?guild=${guild}`)
    .then((r) => r.json())
    .then((j) => {
      const data = j.settings || {};
      cache.set(guild, { data, at: Date.now() });
      return data;
    })
    .finally(() => inflight.delete(guild));
  inflight.set(guild, p);
  return p;
}

// Keep the cache consistent after a save so navigating away and back shows the
// value you just set (no stale flash).
export function updateFeatureCache(guild, feature, enabled, config) {
  if (!guild) return;
  const prev = cache.get(guild)?.data || {};
  cache.set(guild, { data: { ...prev, [feature]: { enabled, config } }, at: Date.now() });
}
