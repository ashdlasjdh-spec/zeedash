import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import GroupPanel from "../../components/GroupPanel";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (<><h1 className="page-h">Group</h1><p className="page-sub">Look up a member, change their rank, or kick them from the Roblox group.</p><GroupPanel /></>);
}
