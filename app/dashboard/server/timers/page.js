import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="clock" title="Timers" subtitle="Recurring scheduled messages." />
      <FeatureSettings
        feature="timers"
        title="Timers"
        description="When on, staff run /timer add to post a message to a channel on a repeating interval (e.g. every 6h). Manage them with /timer list and /timer remove. Timers are restart-safe."
        fields={[]}
      />
    </div>
  );
}
