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
