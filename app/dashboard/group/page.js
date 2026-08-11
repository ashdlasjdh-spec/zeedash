import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import GroupPanel from "../../components/GroupPanel";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level) && !u.scopedGroup) redirect("/dashboard");
  const scoped = u.scopedGroup && !canGroup(u.level);
  return (
    <>
      <PageHeader icon="users" title="Group" subtitle={scoped ? "Rank people to Crew Leader / Leaderboard Staff, or kick those ranks from the group." : "Look up a member, change their rank, or kick them from the Roblox group."} />
      <GroupPanel scoped={scoped} />
    </>
  );
}
