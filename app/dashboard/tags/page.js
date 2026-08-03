import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import TagForm from "../../components/TagForm";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!can(u.role, "tag")) redirect("/dashboard");
  return (<><h1 className="page-h">Crew Tags</h1><p className="page-sub">Make a group-wide tag, or a per-rank tag by filling in the rank field.</p><TagForm/></>);
}
