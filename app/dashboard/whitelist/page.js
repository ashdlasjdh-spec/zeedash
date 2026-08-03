import { getSession } from "@/lib/session";
import { canWhitelist } from "@/lib/permissions";
import { redirect } from "next/navigation";
import WhitelistManager from "../../components/WhitelistManager";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canWhitelist(u.level)) redirect("/dashboard");
  return (<><h1 className="page-h">Whitelist</h1><p className="page-sub">Manually grant someone a level (overrides their Discord role). You can't assign a level above your own.</p><WhitelistManager myLevel={u.level}/></>);
}
