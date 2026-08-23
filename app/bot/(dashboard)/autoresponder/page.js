import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";

export const dynamic = "force-dynamic";

const COLS = [
  { key: "trigger", label: "Trigger", placeholder: "hello", flex: 1 },
  { key: "response", label: "Response", type: "textarea", placeholder: "Hey there! 👋", flex: 2 },
  { key: "exact", label: "Exact", type: "bool", flex: 0.4 },
];

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="smile" title="Autoresponder" subtitle="Reply automatically to trigger phrases. Off until enabled." />
      <FeatureList feature="autoresponder" title="Auto responders" description="When a message contains a trigger (or exactly matches it), the bot replies. Needs the Message Content intent." columns={COLS} addLabel="Add responder" />
    </div>
  );
}
