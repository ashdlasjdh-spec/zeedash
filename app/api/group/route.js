import { getSession } from "@/lib/session";
import { canGroup, canGroupMass } from "@/lib/permissions";
import { getConfig } from "@/lib/config";
import { resolveUsername } from "@/lib/roblox";
import { listGroupRoles, setRank, shiftRank, kickFromGroup, findMembership,
  listJoinRequests, acceptJoinRequest, declineJoinRequest, processAllRequests, shout } from "@/lib/robloxGroups";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId } = await getConfig();
  if (!groupId) return NextResponse.json({ error: "No group id set (Settings → Group ID)." }, { status: 400 });
  try {
    const roles = await listGroupRoles(groupId);
    return NextResponse.json({ groupId, roles });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId } = await getConfig();
  if (!groupId) return NextResponse.json({ error: "No group id set." }, { status: 400 });
  const { action, username, roleId, userId, message } = await req.json();

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
