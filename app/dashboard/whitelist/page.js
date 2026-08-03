import { getSession } from "@/lib/session";
import { canWhitelist } from "@/lib/permissions";
import { redirect } from "next/navigation";
import WhitelistManager from "../../components/WhitelistManager";
export default async function Page() {
  const u = await getSession();
  if (!canWhitelist(u.role)) redirect("/dashboard");
  return (<><h1 className="page-h">Whitelist</h1><p className="page-sub">Control who can sign in and what they can do. You can't assign a role above your own.</p><WhitelistManager myRole={u.role}/></>);
}
