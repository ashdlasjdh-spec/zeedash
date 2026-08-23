import { getSession } from "@/lib/session";
import { canCat, canManageGrants, canPurge } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "./GrantForm";
import PageHeader from "./PageHeader";

// Factory for a grant-category page (Powers, Stands, Car, Tools, Gamepasses, Shazam, Start BR).
// They differ only by category, icon, title, subtitle (and Car's custom verb), so each page is now:
//   export default categoryPage({ category: "power", icon: "bolt", title: "Powers", subtitle: "…" });
export function categoryPage({ category, icon, title, subtitle, verb }) {
  return async function Page() {
    const user = await getSession();
    if (!user) return null;
    if (!canCat(user, category)) redirect("/dashboard");
    return (
      <>
        <PageHeader icon={icon} title={title} subtitle={subtitle} />
        <GrantForm category={category} items={CATALOG[category]} verb={verb} canManage={canManageGrants(user.level)} canPurge={canPurge(user.id)} />
      </>
    );
  };
}
