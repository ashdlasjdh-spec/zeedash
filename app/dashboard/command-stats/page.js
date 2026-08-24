import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { redirect } from "next/navigation";
import CommandStats from "../../components/CommandStats";
import PageHeader from "../../components/PageHeader";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canConfig(u.level)) redirect("/dashboard"); // co owners+ (251), same as the audit log
  return (
    <div className="fullbleed">
      <PageHeader icon="chart" title="Command Stats" subtitle="Which bot commands get used, by whom, and how often. Powered by the bot's usage telemetry." />
      <CommandStats />
    </div>
  );
}
