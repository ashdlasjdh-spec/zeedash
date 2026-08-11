import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AuditLog from "../../components/AuditLog";
import PageHeader from "../../components/PageHeader";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="list" title="Audit Log" subtitle="Every grant, revoke, ban, warn, purge, and config change — who did what, to whom, and when. Filter by staff, action, category, or search a target." />
      <AuditLog />
    </div>
  );
}
