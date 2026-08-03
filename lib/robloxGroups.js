import { getConfig } from "./config";

// ---------- Open Cloud (rank changes, reads) ----------
async function ocGroup(path, { method = "GET", body } = {}) {
  const { apiKey } = await getConfig();
  if (!apiKey) throw new Error("Open Cloud not configured.");
  const res = await fetch(`https://apis.roblox.com/cloud/v2${path}`, {
    method, headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const t = await res.text().catch(() => ""); const e = new Error(`Groups API ${res.status}: ${t.slice(0,200)}`); e.status = res.status; throw e; }
  return res.status === 204 ? {} : res.json();
}
export async function listGroupRoles(groupId) {
  const d = await ocGroup(`/groups/${groupId}/roles?maxPageSize=50`);
  return (d.groupRoles || d.roles || []).map((r) => ({ id: r.id || (r.path ? r.path.split("/").pop() : undefined), name: r.displayName || r.name, rank: r.rank }))
    .sort((a, b) => (a.rank || 0) - (b.rank || 0));
}
export async function findMembership(groupId, userId) {
  const filter = encodeURIComponent(`user == 'users/${userId}'`);
  const d = await ocGroup(`/groups/${groupId}/memberships?maxPageSize=1&filter=${filter}`);
  const m = (d.groupMemberships || [])[0];
  return m ? { path: m.path, roleId: m.role ? m.role.split("/").pop() : null } : null;
}
export async function setRank(groupId, userId, roleId) {
  const m = await findMembership(groupId, userId);
  if (!m) throw new Error("That user isn't in the group.");
  return ocGroup(`/${m.path}?updateMask=role`, { method: "PATCH", body: { role: `groups/${groupId}/roles/${roleId}` } });
}

// ---------- Cookie-based exile (kick) ----------
// SECURITY: the cookie is read from ROBLOX_GROUP_COOKIE (server env only). It is never stored
// in the DB, never sent to the browser, and never logged. Use a DEDICATED alt account whose
// ONLY power in the group is member management — a .ROBLOSECURITY cookie is full account access.
async function csrfToken(cookie) {
  const r = await fetch("https://auth.roblox.com/v2/logout", { method: "POST", headers: { Cookie: `.ROBLOSECURITY=${cookie}` } });
  return r.headers.get("x-csrf-token") || "";
}
export async function kickFromGroup(groupId, userId) {
  const cookie = process.env.ROBLOX_GROUP_COOKIE;
  if (!cookie) throw new Error("Kick needs a group-bot cookie (set ROBLOX_GROUP_COOKIE in the server env).");
  const token = await csrfToken(cookie);
  const res = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`, {
    method: "DELETE",
    headers: { Cookie: `.ROBLOSECURITY=${cookie}`, "X-CSRF-TOKEN": token },
  });
  if (res.status === 401 || res.status === 403) throw new Error(`Exile rejected (${res.status}) — the bot account needs "Manage members" rank permission and a valid cookie.`);
  if (!res.ok) throw new Error(`Exile failed (${res.status}).`);
  return true;
}
