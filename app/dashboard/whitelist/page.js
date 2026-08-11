import { getSession } from "@/lib/session";
import { canWhitelist } from "@/lib/permissions";
import { redirect } from "next/navigation";
import WhitelistManager from "../../components/WhitelistManager";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canWhitelist(u.level)) redirect("/dashboard");
  return (<><PageHeader icon="shield" title="Whitelist" subtitle="Manually grant someone a level (overrides their Discord role). You can't assign a level above your own." /><WhitelistManager myLevel={u.level}/></>);
}
