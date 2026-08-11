import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import GroupPanel from "../../components/GroupPanel";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (<><PageHeader icon="users" title="Group" subtitle="Look up a member, change their rank, or kick them from the Roblox group." /><GroupPanel /></>);
}
