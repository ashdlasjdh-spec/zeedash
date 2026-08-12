import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";
import PublishPanel from "../../../components/PublishPanel";

export const dynamic = "force-dynamic";

const COLS = [
  { key: "message", label: "Message ID", mono: true, placeholder: "123456789012345678", flex: 1 },
  { key: "emoji", label: "Emoji", placeholder: "⭐", flex: 1 },
  { key: "role", label: "Role", type: "role", flex: 1 },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="tag" title="Reaction Roles" subtitle="Give roles when members react to a message. Off until enabled." />
      <FeatureList feature="reactionroles" title="Reaction roles" description="Reacting with the emoji on the message grants the role; removing it takes it away. Hit “Add the emojis” below (or run /reactionsync) and the bot seeds each reaction for you. Bot needs Manage Roles." columns={COLS} addLabel="Add reaction role" />
      <PublishPanel kind="reactionseed" title="Seed the reactions" label="Add the emojis" hint="The bot adds each configured emoji to its message so members can click — same as running /reactionsync." />
    </div>
  );
}
