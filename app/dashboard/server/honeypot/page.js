import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";

export const dynamic = "force-dynamic";

const COLS = [
  { key: "channel", label: "Trap channel", type: "channel", flex: 1.4 },
  { key: "punishment", label: "Punishment", type: "select", options: ["ban", "softban", "kick", "jail"], flex: 1 },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="ban" title="Honeypot" subtitle="Trap channels that punish anyone who posts in them. Off until enabled." />
      <FeatureList feature="honeypot" title="Honeypot traps" description="Any non-admin who sends a message in a trap channel is punished and the message deleted — catches compromised/spam accounts. 'jail' applies a 24h timeout. Bot needs Ban/Kick/Moderate Members." columns={COLS} addLabel="Add trap channel" />
    </div>
  );
}
