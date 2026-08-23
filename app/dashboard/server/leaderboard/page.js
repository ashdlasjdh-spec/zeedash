import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FullLeaderboard from "../../../components/FullLeaderboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="activity" title="Leaderboard" subtitle="Top members by messages, voice hours and reactions — per server and window." />
      <FullLeaderboard />
    </div>
  );
}
