import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";

export const dynamic = "force-dynamic";

const COLS = [
  { key: "message", label: "Message ID", mono: true, placeholder: "123456789012345678", flex: 1 },
  { key: "emoji", label: "Emoji", placeholder: "⭐", flex: 1 },
  { key: "role", label: "Role", type: "role", flex: 1 },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="tag" title="Reaction Roles" subtitle="Give roles when members react to a message. Off until enabled." />
      <FeatureList feature="reactionroles" title="Reaction roles" description="Reacting with the emoji on the message grants the role; removing it takes it away. Add the emoji to the message yourself once so members can click it. Bot needs Manage Roles." columns={COLS} addLabel="Add reaction role" />
    </div>
  );
}
