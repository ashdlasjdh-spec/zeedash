import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";

export const dynamic = "force-dynamic";

const COLS = [
  { key: "trigger", label: "Trigger word (optional)", placeholder: "gg", flex: 1 },
  { key: "channel", label: "Channel ID (optional)", mono: true, placeholder: "123…", flex: 1 },
  { key: "emojis", label: "Emojis", placeholder: "", flex: 1 },
];

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="smile" title="Autoreact" subtitle="Auto-react to messages by keyword or channel. Off until enabled." />
      <FeatureList feature="autoreact" title="Auto reactions" description="The bot reacts with the emojis when a message contains the trigger word, or is posted in the given channel. Space-separate multiple emojis." columns={COLS} addLabel="Add reaction rule" />
    </div>
  );
}
