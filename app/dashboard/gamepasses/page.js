import { getSession } from "@/lib/session";
import { can, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!can(u.level, "gamepass")) redirect("/dashboard");
  return (<><PageHeader icon="ticket" title="Gamepasses" subtitle="Grant gamepass perks. Stored in the shared perks database, applied in-game." /><GrantForm category="gamepass" items={CATALOG.gamepass} canManage={canManageGrants(u.level)} canPurge={canPurge(u.id)} /></>);
}
