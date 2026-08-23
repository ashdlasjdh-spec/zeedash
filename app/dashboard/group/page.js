import { getSession } from "@/lib/session";
import { canGroup, canPurge, scopeLabel, groupAccessOf } from "@/lib/permissions";
import { redirect } from "next/navigation";
import GroupPanel from "../../components/GroupPanel";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  const delegated = !canGroup(u.level) && !u.scopedGroup ? groupAccessOf(u) : null;
  if (!canGroup(u.level) && !u.scopedGroup && !delegated) redirect("/dashboard");
  const scoped = u.scopedGroup && !canGroup(u.level);
  // Full managers (not the named owners) can't assign ranks at/above their own level.
  const capLevel = (canGroup(u.level) && !canPurge(u.id)) ? u.level : null;
  const subtitle = scoped
    ? `Rank people to the ${scopeLabel(u.scope)} rank(s), or kick those ranks from the group.`
    : delegated
    ? "Manage the Roblox group with the actions your role was granted."
    : "Look up a member, change their rank, or kick them from the Roblox group.";
  return (
    <>
      <PageHeader icon="users" title="Group" subtitle={subtitle} />
      <GroupPanel scoped={scoped} scope={u.scope} capLevel={capLevel} delegated={delegated} />
    </>
  );
}
