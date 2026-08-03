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

// Resolve a Roblox username to a userId (public API, no key needed).
export async function resolveUsername(username) {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
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
  const res = await fetch(url, {
    method,
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (method === "GET" && res.status === 404) return null;
  if (!res.ok) throw new Error(`DataStore ${res.status}: ${(await res.text()).slice(0,150)}`);
  return method === "GET" ? res.json() : true;
}
export async function dsGet(datastore, key) { return ds(datastore, key, { method: "GET" }); }
export async function dsSet(datastore, key, value) { return ds(datastore, key, { method: "POST", body: value }); }
