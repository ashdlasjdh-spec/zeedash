import { getSession } from "@/lib/session";
import { can, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
export default async function Page() {
  const u = await getSession();
  if (!can(u.level, "tool")) redirect("/dashboard");
  return (<><h1 className="page-h">Tools</h1><p className="page-sub">Grant any tool — Shazam variants, weapons, powers-as-tools, items. Clones into the player's backpack on spawn.</p><GrantForm category="tool" items={CATALOG.tool} canManage={canManageGrants(u.level)} canPurge={canPurge(u.id)} /></>);
}
