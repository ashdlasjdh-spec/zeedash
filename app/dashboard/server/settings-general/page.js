import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "modlog", label: "Mod-log channel", type: "channel", hint: "Antinuke, Automod, Antiraid and Honeypot post what they did to this channel." },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="gear" title="General" subtitle="Core server settings. Off until enabled." />
      <FeatureSettings feature="settings-general" title="General" description="A mod-log channel where the security features report their actions. Leave the feature off to keep them silent." fields={FIELDS} />
    </div>
  );
}
