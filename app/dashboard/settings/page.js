import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { redirect } from "next/navigation";
import SettingsPanel from "../../components/SettingsPanel";
export default async function Page() {
  const u = await getSession();
  if (!canConfig(u.role)) redirect("/dashboard");
  return (<><h1 className="page-h">Settings</h1><p className="page-sub">Co-founder+ only. Swap the Open Cloud API key and universe ID.</p><SettingsPanel/></>);
}
