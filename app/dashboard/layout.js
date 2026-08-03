import { getSession } from "@/lib/session";
import { grantsFor, canGroup, canWhitelist } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Sidebar from "../components/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }) {
  const user = await getSession();
  if (!user) redirect("/");
  return (
    <div className="shell">
      <Sidebar user={user} grants={grantsFor(user.level)} canGroup={canGroup(user.level)} isCofounderPlus={canWhitelist(user.level)} />
      <main className="main">{children}</main>
    </div>
  );
}
