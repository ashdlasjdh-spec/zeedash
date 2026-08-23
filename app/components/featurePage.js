import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "./PageHeader";
import FeatureSettings from "./FeatureSettings";

// Factory for a standard Server-Management feature page: the session guard + the PageHeader +
// FeatureSettings layout were copy-pasted into ~30 page files. Each page now just does:
//   export const dynamic = "force-dynamic";
//   export default featurePage({ feature, icon, title, subtitle, description, fields });
export function featurePage({ feature, icon = "gear", title, settingsTitle, subtitle, description, fields = [] }) {
  return async function Page() {
    const u = await getSession();
    if (!u) return null;
    if (!canAccessServerSection(u)) redirect("/dashboard");
    return (
      <div className="fullbleed">
        <PageHeader icon={icon} title={title} subtitle={subtitle} />
        <FeatureSettings feature={feature} title={settingsTitle || title} description={description} fields={fields} />
      </div>
    );
  };
}
