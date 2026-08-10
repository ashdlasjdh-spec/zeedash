import { getSession } from "@/lib/session";
import { can, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";

export default async function Page() {
  const user = await getSession();
  if (!can(user.level, "stand")) redirect("/dashboard");
  return (
    <>
      <h1 className="page-h">Stands</h1>
      <p className="page-sub">Give a stand to a player. Persists across sessions.</p>
      <GrantForm category="stand" items={CATALOG.stand} canManage={canManageGrants(user.level)} canPurge={canPurge(user.id)} />
    </>
  );
}
