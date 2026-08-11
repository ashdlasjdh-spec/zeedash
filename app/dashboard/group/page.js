import { getSession } from "@/lib/session";
import { canGroup, canPurge, scopeLabel } from "@/lib/permissions";
import { redirect } from "next/navigation";
import GroupPanel from "../../components/GroupPanel";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level) && !u.scopedGroup) redirect("/dashboard");
  const scoped = u.scopedGroup && !canGroup(u.level);
  // Full managers (not the named owners) can't assign ranks at/above their own level.
  const capLevel = (canGroup(u.level) && !canPurge(u.id)) ? u.level : null;
  return (
    <>
      <PageHeader icon="users" title="Group" subtitle={scoped ? `Rank people to the ${scopeLabel(u.scope)} rank(s), or kick those ranks from the group.` : "Look up a member, change their rank, or kick them from the Roblox group."} />
      <GroupPanel scoped={scoped} scope={u.scope} capLevel={capLevel} />
    </>
  );
}
