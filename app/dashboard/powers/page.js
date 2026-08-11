import { getSession } from "@/lib/session";
import { can, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
import PageHeader from "../../components/PageHeader";

export default async function Page() {
  const user = await getSession();
  if (!user) return null;
  if (!can(user.level, "power")) redirect("/dashboard");
  return (
    <>
      <PageHeader icon="bolt" title="Powers" subtitle="Grant a power to any player. Applies live if they're in-game, and re-applies on their next join." />
      <GrantForm category="power" items={CATALOG.power} canManage={canManageGrants(user.level)} canPurge={canPurge(user.id)} />
    </>
  );
}
