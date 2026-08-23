import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { redirect } from "next/navigation";
import SettingsPanel from "../../components/SettingsPanel";
import IntegrationsPanel from "../../components/IntegrationsPanel";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canConfig(u.level)) redirect("/dashboard");
  return (<><PageHeader icon="gear" title="Settings" subtitle="Co-founder+ only. Open Cloud config and the bot's integration API keys." /><SettingsPanel/><IntegrationsPanel/></>);
}
