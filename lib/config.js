import { query } from "./db";

export async function getConfig() {
  let o = {};
  try { const rows = await query("select key, value from config"); for (const r of rows) o[r.key] = r.value; } catch {}
  return {
    apiKey: o.roblox_api_key || process.env.ROBLOX_API_KEY || "",
    universeId: o.roblox_universe_id || process.env.ROBLOX_UNIVERSE_ID || "",
    groupId: o.roblox_group_id || process.env.ROBLOX_GROUP_ID || "",
    banApiKey: o.roblox_ban_api_key || process.env.ROBLOX_BAN_API_KEY || "",
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
