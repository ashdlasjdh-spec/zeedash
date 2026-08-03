import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";

export default async function Page() {
  const user = await getSession();
  if (!can(user.role, "perk")) redirect("/dashboard");
  return (
    <>
      <h1 className="page-h">Perks</h1>
      <p className="page-sub">Armor, masks, aim assists and spawn items — routed through the perk pipeline.</p>
      <GrantForm category="perk" items={CATALOG.perk} />
    </>
  );
}
