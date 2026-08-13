import { getConfig } from "./config";
import { kvGetJSON, kvSetJSON } from "./kv";

// Live "players in-game" count from Roblox's public games API for the configured universe.
// Cached briefly so many dashboard viewers (and the 30s poll) don't hammer the endpoint —
// games.roblox.com rate-limits shared IPs like Vercel's. Returns the last-known value on a
// transient failure, or null if never fetched / not configured.
let cache = { at: 0, playing: null };
const FRESH_MS = 20000;

export async function getLivePlayers() {
  if (cache.playing != null && Date.now() - cache.at < FRESH_MS) return cache.playing;
  // Cross-instance cache so Vercel's many serverless instances don't EACH hit Roblox (whose shared-IP
  // rate limits bite hardest exactly when lots of instances are warm). Fail-open — on miss we fetch.
  const shared = await kvGetJSON("game:players");
  if (shared && Number.isFinite(shared.playing) && Number.isFinite(shared.at) && Date.now() - shared.at < FRESH_MS) {
    cache = { at: shared.at, playing: shared.playing };
    return shared.playing;
  }
  try {
    const { universeId } = await getConfig();
    if (!universeId) return cache.playing;
    const r = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, { cache: "no-store" });
    if (!r.ok) return cache.playing; // keep last-known on 429 / transient error
    const g = ((await r.json().catch(() => ({})))?.data || [])[0] || {};
    const playing = Number(g.playing) || 0;
    const at = Date.now();
    cache = { at, playing };
    kvSetJSON("game:players", { playing, at }, 25); // shared for ~25s; read-fresh window is 20s
    return playing;
  } catch {
    return cache.playing;
  }
}

// Live list of public game servers for the configured place — [{ id, playing, max, ping, fps }].
// Roblox exposes per-server player count + average ping + FPS, but NOT region. Cached 15s, shared
// cross-instance (so Vercel's instances don't each hit Roblox, which rate-limits shared IPs).
let serversCache = { at: 0, data: null };
export async function getGameServers() {
  if (serversCache.data && Date.now() - serversCache.at < 15000) return serversCache.data;
  const shared = await kvGetJSON("game:servers");
  if (shared && Array.isArray(shared.servers) && Number.isFinite(shared.at) && Date.now() - shared.at < 15000) {
    serversCache = { at: shared.at, data: shared.servers };
    return shared.servers;
  }
  try {
    const { universeId } = await getConfig();
    if (!universeId) return serversCache.data || [];
    // Resolve the root place id from the universe id (the games endpoint returns it).
    const g = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, { cache: "no-store" });
    const placeId = g.ok ? (((await g.json())?.data || [])[0]?.rootPlaceId) : null;
    if (!placeId) return serversCache.data || [];
    const r = await fetch(`https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=100`, { cache: "no-store" });
    if (!r.ok) return serversCache.data || [];
    const d = await r.json().catch(() => ({}));
    const servers = (d.data || []).map((s) => ({
      id: String(s.id || ""),
      playing: Number(s.playing) || 0,
      max: Number(s.maxPlayers) || 0,
      ping: Number.isFinite(s.ping) ? Math.round(s.ping) : null,
      fps: Number.isFinite(s.fps) ? Math.round(s.fps) : null,
    })).sort((a, b) => b.playing - a.playing);
    const at = Date.now();
    serversCache = { at, data: servers };
    kvSetJSON("game:servers", { servers, at }, 20);
    return servers;
  } catch {
    return serversCache.data || [];
  }
}
