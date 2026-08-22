import { getSession } from "@/lib/session";
import { can, canCat, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!canCat(u, "car")) redirect("/dashboard");
  return (<><PageHeader icon="car" title="SVJ Car" subtitle="Grant the SVJ car. The player can spawn it once granted; applies on their next spawn." /><GrantForm category="car" items={CATALOG.car} verb="Grant car" canManage={canManageGrants(u.level)} canPurge={canPurge(u.id)} /></>);
}
