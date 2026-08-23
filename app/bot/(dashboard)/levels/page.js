import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";
import XpLeaderboard from "../../../components/XpLeaderboard";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Level-up channel (blank = same channel)", type: "channel" },
  { key: "message", label: "Level-up message", type: "textarea", rows: 2, placeholder: "🎉 {user.mention} reached level {level.new_rank}!", hint: "Variables: {user.mention} · {user.name} · {level.new_rank} · {guild.name}" },
  { key: "min", label: "Min XP per message", numeric: true, placeholder: "15" },
  { key: "max", label: "Max XP per message", numeric: true, placeholder: "25" },
  { key: "rewards", label: "Role rewards", type: "list", addLabel: "Add reward", cols: [
    { key: "level", label: "Level", placeholder: "5", flex: 0.5 },
    { key: "role", label: "Role", type: "role", flex: 1.5 },
  ] },
];

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="star" title="Levels" subtitle="Reward chat activity with XP, levels and role rewards. Off until enabled." />
      <FeatureSettings feature="levels" title="Levels" description="Members earn XP as they chat (once per minute). Optional level-up message and role rewards. Needs the Message Content intent; role rewards need Manage Roles." fields={FIELDS} />
      <XpLeaderboard />
    </div>
  );
}
