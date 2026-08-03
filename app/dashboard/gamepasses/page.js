import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!can(u.role, "gamepass")) redirect("/dashboard");
  return (<><h1 className="page-h">Gamepasses</h1><p className="page-sub">Grant gamepass perks. Stored in the shared perks database, applied in-game.</p><GrantForm category="gamepass" items={CATALOG.gamepass} /></>);
}
