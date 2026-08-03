// Talks to the SAME perks-api your bot uses, so grants land in the shared DB
// (perks table: gamepasses/powers/tools/armor; crew_tags table). Bearer auth.
const BASE = () => (process.env.PERKS_API_URL || "").replace(/\/$/, "");
function headers() {
  const s = process.env.PERKS_API_SECRET;
  if (!BASE() || !s) throw new Error("Perks API not configured (PERKS_API_URL + PERKS_API_SECRET).");
  return { Authorization: `Bearer ${s}`, "Content-Type": "application/json" };
}
async function call(path, method, body) {
  const r = await fetch(BASE() + path, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`Perks API ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r.json().catch(() => ({}));
}
// add items to a user's perks (merges into the arrays server-side)
export function grantPerks(userId, patch, by) { return call(`/perks/${userId}`, "POST", { ...patch, grantedBy: by }); }
// revoke one: what = "gamepass:NAME" | "tool:NAME" | "power:NAME" | "armor" | "all"
export function revokePerks(userId, what, by) { return call(`/perks/${userId}/revoke`, "POST", { what, grantedBy: by }); }
// crew tags in the shared crew_tags table
export function setTag(groupId, rank, def) {
  const path = (rank === undefined || rank === null || rank === "") ? `/tags/${groupId}` : `/tags/${groupId}/${rank}`;
  return call(path, "POST", def);
}
export function deleteTag(groupId, rank) {
  const path = (rank === undefined || rank === null || rank === "") ? `/tags/${groupId}` : `/tags/${groupId}/${rank}`;
  return call(path, "DELETE");
}
