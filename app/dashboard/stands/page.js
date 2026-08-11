import { getSession } from "@/lib/session";
import { can, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
import PageHeader from "../../components/PageHeader";

export default async function Page() {
  const user = await getSession();
  if (!can(user.level, "stand")) redirect("/dashboard");
  return (
    <>
      <PageHeader icon="star" title="Stands" subtitle="Give a stand to a player. Persists across sessions." />
      <GrantForm category="stand" items={CATALOG.stand} canManage={canManageGrants(user.level)} canPurge={canPurge(user.id)} />
    </>
  );
}
