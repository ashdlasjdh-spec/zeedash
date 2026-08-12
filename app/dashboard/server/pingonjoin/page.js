import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel ID", mono: true, placeholder: "123456789012345678" },
  { key: "message", label: "Message (optional)", type: "textarea", rows: 2, placeholder: "{user.mention} welcome — grab roles in #roles!", hint: "Blank = just ping them. Variables: {user.mention} · {user.name} · {guild.name} · {guild.count}" },
  { key: "delete", label: "Delete the ping after a few seconds", type: "bool" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="users" title="Ping on Join" subtitle="Ping new members in a channel. Off until enabled." />
      <FeatureSettings feature="pingonjoin" title="Ping on join" description="Pings each new member in the chosen channel." fields={FIELDS} />
    </div>
  );
}
