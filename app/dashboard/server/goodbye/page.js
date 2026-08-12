import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel ID", mono: true, placeholder: "123456789012345678", hint: "Enable Developer Mode → right-click the channel → Copy ID." },
  { key: "message", label: "Message", type: "textarea", rows: 3, placeholder: "{user.name} left {server}. We're now {member.count} members.", hint: "Variables: {user.name} · {user.tag} · {server} · {member.count}" },
  { key: "embed", label: "Send as an embed", type: "bool" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="users" title="Goodbye" subtitle="Post a message when a member leaves. Off until you enable it." />
      <FeatureSettings feature="goodbye" title="Goodbye message" description="Posted to the chosen channel whenever someone leaves this server." fields={FIELDS} />
    </div>
  );
}
