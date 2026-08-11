import { getSession } from "@/lib/session";
import { canBan } from "@/lib/permissions";
import { redirect } from "next/navigation";
import BansDashboard from "../../components/BansDashboard";
import PageHeader from "../../components/PageHeader";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canBan(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="ban" title="Moderation dashboard" subtitle="Ban or unban a player from the game via Open Cloud user restrictions, and see every active ban live. Each action posts a log embed to the ban webhook." />
      <BansDashboard />
    </div>
  );
}
