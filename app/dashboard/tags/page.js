import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import TagForm from "../../components/TagForm";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!can(u.level, "tag")) redirect("/dashboard");
  return (<><PageHeader icon="tag" title="Crew Tags" subtitle="Make a group-wide tag, or a per-rank tag by filling in the rank field." /><TagForm/></>);
}
