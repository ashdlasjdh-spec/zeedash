import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import ServerAnalytics from "../../components/ServerAnalytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="activity" title="Server analytics" subtitle="Discord engagement for the servers the bot is in — messages, reactions, voice hours, and the busiest channels over time. Management+." />
      <ServerAnalytics />
    </div>
  );
}
