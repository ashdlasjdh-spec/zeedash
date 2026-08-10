import { getSession } from "@/lib/session";
import { can, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";

export default async function Page() {
  const user = await getSession();
  if (!can(user.level, "startbr")) redirect("/dashboard");
  return (
    <>
      <h1 className="page-h">Start BR</h1>
      <p className="page-sub">
        Grant a player permission to run <b>/startbr</b>. Works in any server, applies live,
        and persists across sessions via the DashboardGrants store.
      </p>
      <GrantForm category="startbr" items={CATALOG.startbr} canManage={canManageGrants(user.level)} canPurge={canPurge(user.id)} />
    </>
  );
}
