import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";

export default async function Page() {
  const user = await getSession();
  if (!can(user.role, "power")) redirect("/dashboard");
  return (
    <>
      <h1 className="page-h">Powers</h1>
      <p className="page-sub">Grant a power to any player. Applies live if they're in-game, and re-applies on their next join.</p>
      <GrantForm category="power" items={CATALOG.power} />
    </>
  );
}
