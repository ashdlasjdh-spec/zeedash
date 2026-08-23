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
      <PageHeader icon="gift" title="Giveaways" subtitle="Reaction giveaways with automatic winner draws." />
      <FeatureSettings
        feature="giveaways"
        title="Giveaways"
        description="When on, staff run /giveaway start to launch a 🎉-reaction giveaway (with optional required roles), and /giveaway end, reroll, cancel, list or edit to manage it. Winners are drawn automatically when the timer ends — even across a bot restart."
        fields={[]}
      />
    </div>
  );
}
