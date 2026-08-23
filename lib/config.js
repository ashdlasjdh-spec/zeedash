import { query } from "./db";

export async function getConfig() {
  let o = {};
  try { const rows = await query("select key, value from config"); for (const r of rows) o[r.key] = r.value; } catch {}
  // Trim every credential/id. A stray space or newline pasted into a Settings field would ride along
  // into the Open Cloud URL path / header and make Roblox reject the request with an opaque validation
  // error ("The string did not match the expected pattern.") — even though the value "looks" right.
  const clean = (v) => String(v ?? "").trim();
  return {
    apiKey: clean(o.roblox_api_key || process.env.ROBLOX_API_KEY),
    universeId: clean(o.roblox_universe_id || process.env.ROBLOX_UNIVERSE_ID),
    groupId: clean(o.roblox_group_id || process.env.ROBLOX_GROUP_ID),
    banApiKey: clean(o.roblox_ban_api_key || process.env.ROBLOX_BAN_API_KEY),
    apiKeySource: o.roblox_api_key ? "dashboard" : "env",
    universeSource: o.roblox_universe_id ? "dashboard" : "env",
    groupSource: o.roblox_group_id ? "dashboard" : "env",
    banApiKeySource: o.roblox_ban_api_key ? "dashboard" : (process.env.ROBLOX_BAN_API_KEY ? "env" : "none"),
  };
}
export async function setConfig(key, value, actorId) {
  await query(
    `insert into config (key, value, updated_by, updated_at) values ($1,$2,$3,now())
     on conflict (key) do update set value=$2, updated_by=$3, updated_at=now()`,
    [key, value, actorId]
  );
}

// ── Integration / API-key registry ──────────────────────────────────────────────
// Every bot feature that needs an external key or endpoint. The bot reads these (env-var name is the
// contract) from the dashboard first, falling back to its own process.env. `env` is both the config
// column suffix source and the name the bot looks up; `secret:true` masks the value in the read UI.
export const INTEGRATION_FIELDS = [
  { group: "AI (ChatGPT & image)", env: "OPENAI_API_KEY", label: "OpenAI API key", secret: true },
  { group: "AI (ChatGPT & image)", env: "OPENAI_MODEL", label: "OpenAI chat model", placeholder: "gpt-4o-mini" },
  { group: "AI (ChatGPT & image)", env: "OPENAI_IMAGE_MODEL", label: "OpenAI image model", placeholder: "gpt-image-1" },
  { group: "Last.fm", env: "LASTFM_API_KEY", label: "Last.fm API key", secret: true },
  { group: "Fortnite", env: "FORTNITE_API_KEY", label: "Fortnite API key (fortnite-api.com)", secret: true },
  { group: "Music (Lavalink)", env: "LAVALINK_URL", label: "Lavalink URL", placeholder: "http://host:2333" },
  { group: "Music (Lavalink)", env: "LAVALINK_PASSWORD", label: "Lavalink password", secret: true },
  { group: "Spotify", env: "SPOTIFY_CLIENT_ID", label: "Spotify client ID" },
  { group: "Spotify", env: "SPOTIFY_CLIENT_SECRET", label: "Spotify client secret", secret: true },
  { group: "Spotify", env: "SPOTIFY_REDIRECT_URI", label: "Spotify redirect URI", placeholder: "https://…/callback" },
  { group: "Media / image tools", env: "REPOST_API_URL", label: "Repost extractor URL (cobalt-style)", placeholder: "https://…/api/json" },
  { group: "Media / image tools", env: "IMAGE_API_URL", label: "Image search / GIF endpoint" },
  { group: "Media / image tools", env: "REMOVEBG_API_KEY", label: "remove.bg API key (transparent)", secret: true },
  { group: "Crypto", env: "COINGECKO_API", label: "CoinGecko base URL (optional)", placeholder: "https://api.coingecko.com/api/v3" },
  ...["TWITTER", "INSTAGRAM", "TIKTOK", "YOUTUBE", "TWITCH", "KICK", "PINTEREST", "SOUNDCLOUD", "SUBREDDIT"].map((p) => ({
    group: "Social notifications", env: `${p}_API_KEY`, label: `${p[0]}${p.slice(1).toLowerCase()} API key`, secret: true,
  })),
];
const INT_COL = (env) => `int_${env.toLowerCase()}`; // config-table key for an integration env var

// Resolved integration values keyed by env-var name: dashboard override first, else process.env.
// Returns { values: {ENV: value}, sources: {ENV: "dashboard"|"env"|"none"} }.
export async function getIntegrations() {
  let o = {};
  try { const rows = await query("select key, value from config"); for (const r of rows) o[r.key] = r.value; } catch {}
  const values = {}, sources = {};
  for (const f of INTEGRATION_FIELDS) {
    const dash = (o[INT_COL(f.env)] ?? "").toString().trim();
    const env = (process.env[f.env] ?? "").toString().trim();
    values[f.env] = dash || env || "";
    sources[f.env] = dash ? "dashboard" : env ? "env" : "none";
  }
  return { values, sources };
}

// Persist one integration value (env-var name) into the config table.
export async function setIntegration(env, value, actorId) {
  if (!INTEGRATION_FIELDS.some((f) => f.env === env)) return false;
  await setConfig(INT_COL(env), String(value ?? "").trim(), actorId);
  return true;
}
