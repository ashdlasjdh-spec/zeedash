import { getSession } from "@/lib/session";
import { canBan } from "@/lib/permissions";
import { redirect } from "next/navigation";
import BansDashboard from "../../components/BansDashboard";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canBan(u.level)) redirect("/dashboard");
  return (
    <>
      <h1 className="page-h">Moderation dashboard</h1>
      <p className="page-sub">Ban or unban a player from the game via Open Cloud user restrictions, and see every active ban live. Each action posts a log embed to the ban webhook.</p>
      <BansDashboard />
    </>
  );
}
