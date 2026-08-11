import { getSession } from "@/lib/session";
import { canGroup, canGroupMass, canPurge, scopeMatches, scopeLabel, isKickOnlyScope } from "@/lib/permissions";
import { getConfig } from "@/lib/config";
import { resolveUsername } from "@/lib/roblox";
import { listGroupRoles, setRank, shiftRank, kickFromGroup, findMembership,
  listJoinRequests, acceptJoinRequest, declineJoinRequest, processAllRequests, shout } from "@/lib/robloxGroups";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s || (!canGroup(s.level) && !s.scopedGroup)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId } = await getConfig();
  if (!groupId) return NextResponse.json({ error: "No group id set (Settings → Group ID)." }, { status: 400 });
  try {
    const roles = await listGroupRoles(groupId);
    // `scoped` tells the UI to show only rank+kick (for the crew-leader / leaderboard-staff ranks).
    return NextResponse.json({ groupId, roles, scoped: s.scopedGroup && !canGroup(s.level) });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req) {
  const s = await getSession();
  if (!s || (!canGroup(s.level) && !s.scopedGroup)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId } = await getConfig();
  if (!groupId) return NextResponse.json({ error: "No group id set." }, { status: 400 });
  const { action, username, roleId, userId, message } = await req.json();

  // Scoped users (e.g. Leaderboard HR): only lookup / rank / kick, and only for the
  // crew-leader & leaderboard-staff group ranks. Everything else is management-only.
  const scoped = s.scopedGroup && !canGroup(s.level);
  const kickOnly = scoped && isKickOnlyScope(s.scope); // e.g. Leaderboard HR: kick within its ranks, nothing else
  const allowedScopedActions = kickOnly ? ["lookup", "kick"] : ["lookup", "rank", "kick", "accept"];
  if (scoped && !allowedScopedActions.includes(action)) {
    return NextResponse.json({ error: kickOnly ? `You can only kick ${scopeLabel(s.scope)} members.` : "Your role can only rank/kick Crew Leader / Leaderboard Staff, or accept a pending join request." }, { status: 403 });
  }
  // Rank protection: a full group manager (but not the named owners) can never assign, promote to, or
  // act on any group rank at or above their OWN level — so e.g. Head Management can't promote anyone to
  // Head Management or higher. (Roblox group ranks mirror the Discord level ladder.)
  const cap = canGroup(s.level) && !canPurge(s.id);

  try {
    // ---- join requests + shout (no username needed) ----
    if (action === "requests") return NextResponse.json({ requests: await listJoinRequests(groupId) });
    if (action === "accept") { await acceptJoinRequest(groupId, userId); await log(s, "accept", { username: userId, userId }, "join request accepted"); return NextResponse.json({ ok: true }); }
    if (action === "decline") { await declineJoinRequest(groupId, userId); await log(s, "decline", { username: userId, userId }, "join request declined"); return NextResponse.json({ ok: true }); }
    if (action === "acceptAll" || action === "declineAll") {
      if (!canGroupMass(s.level)) return NextResponse.json({ error: "Bulk accept/decline is overseer+ only." }, { status: 403 });
      const accept = action === "acceptAll";
      const r = await processAllRequests(groupId, accept);
      await log(s, action, { username: "—", userId: 0 }, `${r.ok}/${r.total} ${accept ? "accepted" : "declined"}`);
      return NextResponse.json({ ok: true, ...r });
    }
    if (action === "shout") { await shout(groupId, message); await log(s, "shout", { username: "—", userId: 0 }, String(message || "").slice(0, 120)); return NextResponse.json({ ok: true }); }

    // ---- member actions (need a username) ----
    const user = await resolveUsername(username);
    if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });
    if (action === "lookup") {
      const m = await findMembership(groupId, user.userId);
      // If they're not a member, surface whether they have a pending join request (so it can be accepted).
      let pending = false;
      if (!m) { try { const reqs = await listJoinRequests(groupId); pending = (reqs || []).some((r) => String(r.userId) === String(user.userId)); } catch {} }
      return NextResponse.json({ target: user, inGroup: !!m, roleId: m?.roleId || null, pending });
    }
    if (action === "rank") {
      const roles = await listGroupRoles(groupId);
      const role = roles.find((r) => String(r.id) === String(roleId));
      if (!role) return NextResponse.json({ error: "Unknown rank." }, { status: 400 });
      if (scoped && !scopeMatches(s.scope, role.name)) return NextResponse.json({ error: `You can only assign the ${scopeLabel(s.scope)} rank(s).` }, { status: 403 });
      if (cap) {
        if (Number(role.rank) >= s.level) return NextResponse.json({ error: "You can only assign ranks below your own." }, { status: 403 });
        const cur = await findMembership(groupId, user.userId);
        const curRole = cur && roles.find((r) => String(r.id) === String(cur.roleId));
        if (curRole && Number(curRole.rank) >= s.level) return NextResponse.json({ error: "That member is ranked at or above you." }, { status: 403 });
      }
      await setRank(groupId, user.userId, roleId);
      await log(s, "rank", user, `role ${roleId}`);
      return NextResponse.json({ ok: true, target: user });
    }
    if (action === "promote" || action === "demote") {
      if (cap) {
        const roles = await listGroupRoles(groupId);
        const cur = await findMembership(groupId, user.userId);
        const curRole = cur && roles.find((r) => String(r.id) === String(cur.roleId));
        const curRank = Number(curRole?.rank) || 0;
        if (curRank >= s.level) return NextResponse.json({ error: "That member is ranked at or above you." }, { status: 403 });
        if (action === "promote") {
          const next = roles.filter((r) => Number(r.rank) > curRank).sort((a, b) => a.rank - b.rank)[0];
          if (next && Number(next.rank) >= s.level) return NextResponse.json({ error: "That would promote them to your rank or above." }, { status: 403 });
        }
      }
      const r = await shiftRank(groupId, user.userId, action === "promote" ? 1 : -1);
      await log(s, action, user, `${r.from} → ${r.to}`);
      return NextResponse.json({ ok: true, target: user, ...r });
    }
    if (action === "kick") {
      const roles = await listGroupRoles(groupId);
      const m = await findMembership(groupId, user.userId);
      const role = m && roles.find((r) => String(r.id) === String(m.roleId));
      if (scoped && (!role || !scopeMatches(s.scope, role.name))) return NextResponse.json({ error: `You can only kick ${scopeLabel(s.scope)} members.` }, { status: 403 });
      if (cap && role && Number(role.rank) >= s.level) return NextResponse.json({ error: "That member is ranked at or above you." }, { status: 403 });
      await kickFromGroup(groupId, user.userId);
      await log(s, "kick", user, "removed from group");
      return NextResponse.json({ ok: true, target: user });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

// Best-effort audit — a logging hiccup must never fail the group action it records.
async function log(s, action, user, detail) {
  await logAudit({ actorId: s.id, actorName: s.name, action, category: "group", target: `${user.username} (${user.userId})`, detail });
}
