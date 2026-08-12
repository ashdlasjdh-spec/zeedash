import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import ServerAnalytics from "../../components/ServerAnalytics";
import FeatureOverview from "../../components/FeatureOverview";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <ServerAnalytics userName={u.name} />
      <FeatureOverview />
    </div>
  );
}
