import { serverSectionUser } from "@/lib/guards";
import ServerAnalytics from "../../components/ServerAnalytics";
import FeatureOverview from "../../components/FeatureOverview";
import SettingsBackup from "../../components/SettingsBackup";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <ServerAnalytics userName={u.name} />
      <FeatureOverview />
      <SettingsBackup />
    </div>
  );
}
