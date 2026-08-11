import { getSession } from "@/lib/session";
import { can, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
import PageHeader from "../../components/PageHeader";

export default async function Page() {
  const user = await getSession();
  if (!can(user.level, "startbr")) redirect("/dashboard");
  return (
    <>
      <PageHeader icon="flag" title="Start BR" subtitle={<>Grant a player permission to run <b>/startbr</b>. Works in any server, applies live, and persists across sessions via the DashboardGrants store.</>} />
      <GrantForm category="startbr" items={CATALOG.startbr} canManage={canManageGrants(user.level)} canPurge={canPurge(user.id)} />
    </>
  );
}
