import { getSession } from "@/lib/session";
import { can, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!can(u.level, "tool")) redirect("/dashboard");
  return (<><PageHeader icon="wrench" title="Tools" subtitle="Grant any tool — Shazam variants, weapons, powers-as-tools, items. Clones into the player's backpack on spawn." /><GrantForm category="tool" items={CATALOG.tool} canManage={canManageGrants(u.level)} canPurge={canPurge(u.id)} /></>);
}
