import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel", type: "channel" },
  { key: "message", label: "Sticky message", type: "textarea", rows: 3, placeholder: "📌 Read the rules before posting!" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="flag" title="Sticky Message" subtitle="Keep a message pinned to the bottom of a channel. Off until enabled." />
      <FeatureSettings feature="sticky" title="Sticky message" description="Re-posted to the bottom of the channel as people chat (bot needs Manage Messages)." fields={FIELDS} />
    </div>
  );
}
