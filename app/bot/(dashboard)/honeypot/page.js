import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";

export const dynamic = "force-dynamic";

const COLS = [
  { key: "channel", label: "Trap channel", type: "channel", flex: 1.4 },
  { key: "punishment", label: "Punishment", type: "select", options: ["ban", "softban", "kick", "jail"], flex: 1 },
];

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="ban" title="Honeypot" subtitle="Trap channels that punish anyone who posts in them. Off until enabled." />
      <FeatureList feature="honeypot" title="Honeypot traps" description="Any non-admin who sends a message in a trap channel is punished and the message deleted — catches compromised/spam accounts. 'jail' applies a 24h timeout. Bot needs Ban/Kick/Moderate Members." columns={COLS} addLabel="Add trap channel" />
    </div>
  );
}
