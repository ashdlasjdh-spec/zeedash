import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
export default async function Page() {
  const u = await getSession();
  if (!can(u.level, "car")) redirect("/dashboard");
  return (<><h1 className="page-h">SVJ Car</h1><p className="page-sub">Grant the SVJ car. The player can spawn it once granted; applies on their next spawn.</p><GrantForm category="car" items={CATALOG.car} verb="Grant car" /></>);
}
