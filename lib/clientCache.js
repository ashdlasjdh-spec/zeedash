"use client";
// Generic client-side stale-while-revalidate cache, keyed by an arbitrary
// string. This is the same idea as guildSettingsClient (which caches the guild
// settings blob) generalised so any Server-/Game-tab page can render instantly
// on remount instead of flashing an empty state while its first fetch lands.
//
// Usage:
//   const { data, loading, refresh, mutate } = useCachedResource("whitelist",
//     () => fetch("/api/whitelist").then((r) => r.json()).then((d) => d.list));
//
// The first mount pays the round-trip (loading === true, data === undefined);
// every remount within TTL renders the cached value immediately and refetches
// in the background (loading stays false, data is the stale value until fresh).
import { useCallback, useEffect, useRef, useState } from "react";

const store = new Map(); // key -> { data, at }
const inflight = new Map(); // key -> Promise
const DEFAULT_TTL = 15_000;

export function peekCache(key) {
  return key ? store.get(key)?.data : undefined;
}

// Overwrite the cached value for a key (e.g. right after a successful mutation)
// so navigating away and back shows the new value with no stale flash.
export function setCache(key, data) {
  if (key) store.set(key, { data, at: Date.now() });
}

export function invalidateCache(key) {
  if (key) store.delete(key);
}

async function loadResource(key, fetcher, { force = false, ttl = DEFAULT_TTL } = {}) {
  const hit = store.get(key);
  if (!force && hit && Date.now() - hit.at < ttl) return hit.data;
  if (!force && inflight.has(key)) return inflight.get(key);
  const p = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      store.set(key, { data, at: Date.now() });
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

// React hook wrapping the cache. `fetcher` should return the resolved value
// (not a Response). Pass a null/falsy `key` to disable fetching.
export function useCachedResource(key, fetcher, { ttl = DEFAULT_TTL } = {}) {
  const [data, setData] = useState(() => peekCache(key));
  const [loading, setLoading] = useState(() => peekCache(key) === undefined);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(
    async (force) => {
      if (!key) return;
      const cached = peekCache(key);
      if (cached !== undefined) setData(cached);
      setLoading(cached === undefined);
      try {
        const fresh = await loadResource(key, () => fetcherRef.current(), { force, ttl });
        setData(fresh);
        setError(null);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [key, ttl]
  );

  useEffect(() => {
    run(false);
  }, [run]);

  // Optimistically replace local + cached data without a refetch.
  const mutate = useCallback(
    (next) => {
      setData((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        setCache(key, value);
        return value;
      });
    },
    [key]
  );

  return { data, loading, error, refresh: () => run(true), mutate };
}
