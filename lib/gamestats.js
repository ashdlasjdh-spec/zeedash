import { getConfig } from "./config";
import { query } from "./db";
import { GAME_DEFAULTS } from "./gameDefaults";
import { kvGetJSON, kvSetJSON } from "./kv";

// Live "players in-game" count from Roblox's public games API. The universe is resolved from the SAME
// place ID the public game site (zeehood.org) uses for its live count — the one stored in the game_site
// config (default 134743974543044) — so the dashboard and the site always agree. We resolve place → universe
// via Roblox's public API (cached for hours since it never changes), with the dashboard/env
// ROBLOX_UNIVERSE_ID as a fallback only. Player counts are cached briefly so many dashboard viewers (and
// the 30s poll) don't hammer games.roblox.com, which rate-limits shared IPs like Vercel's.
let cache = { at: 0, playing: null };
const FRESH_MS = 20000;

// The place ID the game site renders — read from the game_site config, else the bundled default.
async function gamePlaceId() {
  try {
    const rows = await query("select value from config where key = 'game_site'");
    if (rows[0]?.value) {
      const c = JSON.parse(rows[0].value);
      if (/^\d{1,20}$/.test(String(c.placeId || ""))) return String(c.placeId);
    }
  } catch { /* DB down / not set — fall through to default */ }
  return GAME_DEFAULTS.placeId;
}

// Resolve the universe id: prefer the game-site place ID (what the user points at and what zeehood.org
// uses), falling back to a dashboard/env-configured universe id only if that resolution can't be made.
// The place→universe mapping is stable, so it's cached for hours.
let uniCache = { at: 0, id: null, placeId: null };
const UNI_TTL_MS = 6 * 60 * 60 * 1000;
async function resolveUniverseId() {
  const placeId = await gamePlaceId();
  if (uniCache.id && uniCache.placeId === placeId && Date.now() - uniCache.at < UNI_TTL_MS) return uniCache.id;
  try {
    const r = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, { cache: "no-store" });
    if (r.ok) {
      const id = ((await r.json().catch(() => ({})))?.universeId) || null;
      if (id) { uniCache = { at: Date.now(), id: String(id), placeId }; return String(id); }
    }
  } catch { /* transient — fall through to fallback / last-known */ }
  // Fallbacks: a still-valid cached resolution, else the dashboard/env universe id.
  if (uniCache.id) return uniCache.id;
  try { const { universeId } = await getConfig(); if (universeId) return String(universeId); } catch { /* ignore */ }
  return null;
}

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
    const universeId = await resolveUniverseId();
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
