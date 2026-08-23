import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";

export const dynamic = "force-dynamic";

const COMMANDS = ["makeembed", "editembed", "buttonpanel", "sendembed", "ticketpanel", "antinuke"];
const COLS = [
  { key: "command", label: "Command", type: "select", options: COMMANDS, flex: 1 },
  { key: "channel", label: "Allowed channel", type: "channel", flex: 1.3 },
];

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="gear" title="Restrict" subtitle="Limit bot commands to specific channels. Off until enabled." />
      <FeatureList feature="restrict" title="Command restrictions" description="A command with any rows here can only be used in the listed channel(s). Add a row per command+channel. Bot owners bypass." columns={COLS} addLabel="Add restriction" />
    </div>
  );
}
