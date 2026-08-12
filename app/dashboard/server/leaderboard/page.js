import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FullLeaderboard from "../../../components/FullLeaderboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="activity" title="Leaderboard" subtitle="Top members by messages, voice hours and reactions — per server and window." />
      <FullLeaderboard />
    </div>
  );
}
