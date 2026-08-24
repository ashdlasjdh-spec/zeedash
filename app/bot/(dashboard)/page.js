import { serverSectionUser } from "@/lib/guards";
import ServerAnalytics from "../../components/ServerAnalytics";
import FeatureOverview from "../../components/FeatureOverview";
import SettingsBackup from "../../components/SettingsBackup";
import ServerGrid from "../../components/ServerGrid";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <ServerGrid />
      <ServerAnalytics userName={u.name} />
      <FeatureOverview />
      <SettingsBackup />
    </div>
  );
}
