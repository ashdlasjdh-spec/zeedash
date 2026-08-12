import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import ServerAnalytics from "../../components/ServerAnalytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <ServerAnalytics userName={u.name} />
    </div>
  );
}
