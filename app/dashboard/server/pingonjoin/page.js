import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel", type: "channel" },
  { key: "message", label: "Message (optional)", type: "textarea", rows: 2, placeholder: "{user.mention} welcome — grab roles in #roles!", hint: "Blank = just ping them. Variables: {user.mention} · {user.name} · {guild.name} · {guild.count}" },
  { key: "delete", label: "Delete the ping after a few seconds", type: "bool" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="users" title="Ping on Join" subtitle="Ping new members in a channel. Off until enabled." />
      <FeatureSettings feature="pingonjoin" title="Ping on join" description="Pings each new member in the chosen channel." fields={FIELDS} />
    </div>
  );
}
