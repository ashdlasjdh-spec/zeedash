import { getSession } from "@/lib/session";
import { canGroup, canGroupMass, isScopedRankName } from "@/lib/permissions";
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
  if (scoped && !["lookup", "rank", "kick"].includes(action)) {
    return NextResponse.json({ error: "Your role can only rank or kick Crew Leader / Leaderboard Staff." }, { status: 403 });
  }

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
      return NextResponse.json({ target: user, inGroup: !!m, roleId: m?.roleId || null });
    }
    if (action === "rank") {
      if (scoped) {
        const roles = await listGroupRoles(groupId);
        const role = roles.find((r) => String(r.id) === String(roleId));
        if (!role || !isScopedRankName(role.name)) return NextResponse.json({ error: "You can only assign the Crew Leader / Leaderboard Staff ranks." }, { status: 403 });
      }
      await setRank(groupId, user.userId, roleId);
      await log(s, "rank", user, `role ${roleId}`);
      return NextResponse.json({ ok: true, target: user });
    }
    if (action === "promote" || action === "demote") {
      const r = await shiftRank(groupId, user.userId, action === "promote" ? 1 : -1);
      await log(s, action, user, `${r.from} → ${r.to}`);
      return NextResponse.json({ ok: true, target: user, ...r });
    }
    if (action === "kick") {
      if (scoped) {
        const m = await findMembership(groupId, user.userId);
        const roles = await listGroupRoles(groupId);
        const role = roles.find((r) => String(r.id) === String(m?.roleId));
        if (!role || !isScopedRankName(role.name)) return NextResponse.json({ error: "You can only kick Crew Leader / Leaderboard Staff members." }, { status: 403 });
      }
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
