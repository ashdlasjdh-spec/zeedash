import { getConfig } from "./config";

// Live "players in-game" count from Roblox's public games API for the configured universe.
// Cached briefly so many dashboard viewers (and the 30s poll) don't hammer the endpoint —
// games.roblox.com rate-limits shared IPs like Vercel's. Returns the last-known value on a
// transient failure, or null if never fetched / not configured.
let cache = { at: 0, playing: null };

export async function getLivePlayers() {
  if (cache.playing != null && Date.now() - cache.at < 20000) return cache.playing;
  try {
    const { universeId } = await getConfig();
    if (!universeId) return cache.playing;
    const r = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, { cache: "no-store" });
    if (!r.ok) return cache.playing; // keep last-known on 429 / transient error
    const g = ((await r.json().catch(() => ({})))?.data || [])[0] || {};
    const playing = Number(g.playing) || 0;
    cache = { at: Date.now(), playing };
    return playing;
  } catch {
    return cache.playing;
  }
}
