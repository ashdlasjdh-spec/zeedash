import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Log channel", type: "channel" },
  { key: "joins", label: "Log member joins", type: "bool" },
  { key: "leaves", label: "Log member leaves", type: "bool" },
  { key: "deletes", label: "Log deleted messages", type: "bool" },
  { key: "edits", label: "Log edited messages", type: "bool" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="list" title="Logs" subtitle="Send server events to a log channel. Off until enabled." />
      <FeatureSettings feature="logging" title="Server logging" description="Chosen events are posted to the log channel. Message logs need the Message Content intent." fields={FIELDS} />
    </div>
  );
}
