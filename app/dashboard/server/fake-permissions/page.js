import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "roles", label: "Roles", type: "roles", hint: "These roles may use the bot's admin commands (/makeembed, /editembed, /buttonpanel, /sendembed, /ticketpanel) without needing Discord's Administrator permission." },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="shield" title="Fake Permissions" subtitle="Let trusted roles use the bot's admin commands without real Discord admin. Off until enabled." />
      <FeatureSettings feature="fake-permissions" title="Fake permissions" description="Grant specific roles access to the bot's Administrator-gated commands in this server — without giving them Discord's Administrator permission." fields={FIELDS} />
    </div>
  );
}
