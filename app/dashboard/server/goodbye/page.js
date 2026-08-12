import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel", type: "channel" },
  { key: "message", label: "Message", type: "textarea", rows: 3, placeholder: "{user.name} left {guild.name}. We're now {guild.count} members.", hint: "Variables: {user.name} · {user.display_name} · {user.tag} · {guild.name} · {guild.count}" },
  { key: "embed", label: "Send as an embed", type: "bool" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="users" title="Goodbye" subtitle="Post a message when a member leaves. Off until you enable it." />
      <FeatureSettings feature="goodbye" title="Goodbye message" description="Posted to the chosen channel whenever someone leaves this server." fields={FIELDS} />
    </div>
  );
}
