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
      <PageHeader icon="activity" title="Counter Channels" subtitle="Live channels that display your member, boost and online counts." />
      <FeatureSettings
        feature="counters"
        title="Counter channels"
        description="When on, staff run /counter add to create a voice/text channel whose name shows a live stat (members, humans, bots, boosts, online, roles, channels). It refreshes automatically on joins/leaves and on a timer. Manage them with /counter list and /counter remove."
        fields={[]}
      />
    </div>
  );
}
