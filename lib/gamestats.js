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

// Live list of public game servers for the configured place — { servers: [{ id, playing, max, ping,
// fps, avatars: [url] }], placeId }. Avatars come from the server's playerTokens resolved via Roblox's
// batch-thumbnail API (server-side; the browser is CORS-blocked). placeId powers the join links.
// Roblox does NOT expose region. Cached 15s, shared cross-instance.
let serversCache = { at: 0, servers: null, placeId: null };
export async function getGameServers() {
  if (serversCache.servers && Date.now() - serversCache.at < 15000) return { servers: serversCache.servers, placeId: serversCache.placeId };
  const shared = await kvGetJSON("game:servers");
  if (shared && Array.isArray(shared.servers) && Number.isFinite(shared.at) && Date.now() - shared.at < 15000) {
    serversCache = { at: shared.at, servers: shared.servers, placeId: shared.placeId || null };
    return { servers: shared.servers, placeId: shared.placeId || null };
  }
  const last = () => ({ servers: serversCache.servers || [], placeId: serversCache.placeId || null });
  try {
    const { universeId } = await getConfig();
    if (!universeId) return last();
    const g = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, { cache: "no-store" });
    const placeId = g.ok ? (((await g.json())?.data || [])[0]?.rootPlaceId) : null;
    if (!placeId) return last();
    const r = await fetch(`https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=100`, { cache: "no-store" });
    if (!r.ok) return { servers: serversCache.servers || [], placeId };
    const d = await r.json().catch(() => ({}));
    const servers = (d.data || []).map((s) => ({
      id: String(s.id || ""),
      playing: Number(s.playing) || 0,
      max: Number(s.maxPlayers) || 0,
      ping: Number.isFinite(s.ping) ? Math.round(s.ping) : null,
      fps: Number.isFinite(s.fps) ? Math.round(s.fps) : null,
      tokens: Array.isArray(s.playerTokens) ? s.playerTokens.slice(0, 6) : [],
      avatars: [],
    })).sort((a, b) => b.playing - a.playing);

    // Resolve up to 100 avatar tokens across all servers in ONE batch call.
    try {
      const jobs = [];
      servers.forEach((s, si) => s.tokens.forEach((t) => { if (jobs.length < 100) jobs.push({ si, requestId: String(jobs.length), token: t }); }));
      if (jobs.length) {
        const br = await fetch("https://thumbnails.roblox.com/v1/batch", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jobs.map((j) => ({ requestId: j.requestId, token: j.token, type: "AvatarHeadShot", size: "48x48", format: "Png", isCircular: true }))),
        });
        if (br.ok) {
          const bd = await br.json().catch(() => ({}));
          const byReq = {};
          for (const it of (bd.data || [])) if (it.state === "Completed" && it.imageUrl) byReq[it.requestId] = it.imageUrl;
          jobs.forEach((j) => { const url = byReq[j.requestId]; if (url) servers[j.si].avatars.push(url); });
        }
      }
    } catch { /* avatars are best-effort */ }
    for (const s of servers) delete s.tokens;

    const at = Date.now();
    serversCache = { at, servers, placeId };
    kvSetJSON("game:servers", { servers, placeId, at }, 20);
    return { servers, placeId };
  } catch {
    return last();
  }
}
