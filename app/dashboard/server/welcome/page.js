import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel", type: "channel" },
  { key: "message", label: "Message", type: "textarea", rows: 3, placeholder: "Welcome {user.mention} to {guild.name}! You're member #{guild.count}.", hint: "Variables: {user.mention} · {user.name} · {user.display_name} · {user.tag} · {guild.name} · {guild.count}" },
  { key: "embed", label: "Send as an embed", type: "bool" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="users" title="Welcome" subtitle="Greet new members when they join. Off until you enable it." />
      <FeatureSettings feature="welcome" title="Welcome message" description="Posted to the chosen channel whenever someone joins this server." fields={FIELDS} />
    </div>
  );
}
