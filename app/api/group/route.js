import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { getConfig } from "@/lib/config";
import { resolveUsername } from "@/lib/roblox";
import { listGroupRoles, setRank, kickFromGroup, findMembership } from "@/lib/robloxGroups";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getSession();
  if (!s || !canGroup(s.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId } = await getConfig();
  if (!groupId) return NextResponse.json({ error: "No group id set (Settings → Group ID)." }, { status: 400 });
  try {
    const roles = await listGroupRoles(groupId);
    return NextResponse.json({ groupId, roles });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canGroup(s.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { groupId } = await getConfig();
  if (!groupId) return NextResponse.json({ error: "No group id set." }, { status: 400 });
  const { action, username, roleId } = await req.json();
  const user = await resolveUsername(username);
  if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });

  try {
    if (action === "lookup") {
      const m = await findMembership(groupId, user.userId);
      return NextResponse.json({ target: user, inGroup: !!m, roleId: m?.roleId || null });
    }
    if (action === "rank") {
      await setRank(groupId, user.userId, roleId);
      await log(s, "rank", user, `role ${roleId}`);
      return NextResponse.json({ ok: true, target: user });
    }
    if (action === "kick") {
      await kickFromGroup(groupId, user.userId);
      await log(s, "kick", user, "removed from group");
      return NextResponse.json({ ok: true, target: user });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

async function log(s, action, user, detail) {
  await query(`insert into audit_log (actor_id, actor_name, action, category, target, detail) values ($1,$2,$3,'group',$4,$5)`,
    [s.id, s.name, action, `${user.username} (${user.userId})`, detail]);
}
