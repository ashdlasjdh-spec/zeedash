import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AuditLog from "../../components/AuditLog";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <h1 className="page-h">Audit Log</h1>
      <p className="page-sub">Every grant, revoke, ban, warn, purge, and config change — who did what, to whom, and when. Filter by staff, action, category, or search a target.</p>
      <AuditLog />
    </div>
  );
}
