import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Level-up channel ID (blank = same channel)", mono: true, placeholder: "123456789012345678" },
  { key: "message", label: "Level-up message", type: "textarea", rows: 2, placeholder: "🎉 {user.mention} reached level {level.new_rank}!", hint: "Variables: {user.mention} · {user.name} · {level.new_rank} · {guild.name}" },
  { key: "min", label: "Min XP per message", numeric: true, placeholder: "15" },
  { key: "max", label: "Max XP per message", numeric: true, placeholder: "25" },
  { key: "rewards", label: "Role rewards", type: "list", addLabel: "Add reward", cols: [
    { key: "level", label: "Level", placeholder: "5", flex: 0.5 },
    { key: "role", label: "Role ID", placeholder: "123456789012345678", mono: true, flex: 1.5 },
  ] },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="star" title="Levels" subtitle="Reward chat activity with XP, levels and role rewards. Off until enabled." />
      <FeatureSettings feature="levels" title="Levels" description="Members earn XP as they chat (once per minute). Optional level-up message and role rewards. Needs the Message Content intent; role rewards need Manage Roles." fields={FIELDS} />
    </div>
  );
}
