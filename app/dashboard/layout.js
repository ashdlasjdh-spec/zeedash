import { getSession } from "@/lib/session";
import { PERMISSIONS, isCofounderPlus, canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Sidebar from "../components/Sidebar";
export default async function DashLayout({ children }) {
  const user = await getSession();
  if (!user) redirect("/");
  const grants = PERMISSIONS[user.role]?.grant || [];
  return (
    <div className="shell">
      <Sidebar user={user} grants={grants} canGroup={canGroup(user.role)} isCofounderPlus={isCofounderPlus(user.role)} />
      <main className="main">{children}</main>
    </div>
  );
}
