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

// Move a member one role up (dir=+1) or down (dir=-1) the rank ladder, skipping the
// Guest(0) and Owner(255) roles. Returns { from, to } role names for the reply.
export async function shiftRank(groupId, userId, dir) {
  const roles = (await listGroupRoles(groupId)).filter((r) => r.rank > 0 && r.rank < 255);
  const m = await findMembership(groupId, userId);
  if (!m) throw new Error("That user isn't in the group.");
  const idx = roles.findIndex((r) => String(r.id) === String(m.roleId));
  if (idx === -1) throw new Error("Couldn't read the member's current rank.");
  const next = roles[idx + dir];
  if (!next) throw new Error(dir > 0 ? "Already at the highest assignable rank." : "Already at the lowest rank.");
  await setRank(groupId, userId, next.id);
  return { from: roles[idx].name, to: next.name };
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

// ---------- Join requests + shout (cookie-based, like exile) ----------
function cookie() {
  const c = process.env.ROBLOX_GROUP_COOKIE;
  if (!c) throw new Error("Set ROBLOX_GROUP_COOKIE (a group-bot account cookie) in the server env.");
  return c;
}
async function groupReq(path, { method = "GET", body } = {}) {
  const c = cookie();
  const token = method === "GET" ? "" : await csrfToken(c);
  const res = await fetch(`https://groups.roblox.com/v1${path}`, {
    method,
    headers: { Cookie: `.ROBLOSECURITY=${c}`, "X-CSRF-TOKEN": token, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) throw new Error(`Rejected (${res.status}) — bot account needs "Manage members" and a valid cookie.`);
  if (!res.ok) throw new Error(`Group API ${res.status}: ${(await res.text().catch(() => "")).slice(0, 150)}`);
  return res.status === 200 ? res.json().catch(() => ({})) : {};
}
export async function listJoinRequests(groupId) {
  const d = await groupReq(`/groups/${groupId}/join-requests?limit=100&sortOrder=Asc`);
  return (d.data || []).map((j) => ({ userId: j.requester?.userId, username: j.requester?.username, created: j.created }));
}
export async function acceptJoinRequest(groupId, userId) { return groupReq(`/groups/${groupId}/join-requests/users/${userId}`, { method: "POST" }); }
export async function declineJoinRequest(groupId, userId) { return groupReq(`/groups/${groupId}/join-requests/users/${userId}`, { method: "DELETE" }); }
export async function processAllRequests(groupId, accept) {
  const reqs = await listJoinRequests(groupId);
  let ok = 0, fail = 0;
  for (const r of reqs) {
    try { accept ? await acceptJoinRequest(groupId, r.userId) : await declineJoinRequest(groupId, r.userId); ok++; }
    catch { fail++; }
  }
  return { total: reqs.length, ok, fail };
}
export async function shout(groupId, message) { return groupReq(`/groups/${groupId}/status`, { method: "PATCH", body: { message: String(message || "").slice(0, 255) } }); }
