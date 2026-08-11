import { getSession } from "@/lib/session";
import { can, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
import PageHeader from "../../components/PageHeader";

export default async function Page() {
  const user = await getSession();
  if (!can(user.level, "shazam")) redirect("/dashboard");
  return (
    <>
      <PageHeader icon="bolt" title="Shazam" subtitle="Grant a Shazam variant to any player. Applies live if they're in-game and persists across sessions (PlayerPerks + shared DB), so it survives universe swaps." />
      <GrantForm category="shazam" items={CATALOG.shazam} canManage={canManageGrants(user.level)} canPurge={canPurge(user.id)} />
    </>
  );
}
