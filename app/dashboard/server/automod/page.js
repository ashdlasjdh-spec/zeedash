import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";
import AutomodRules from "../../../components/AutomodRules";

export const dynamic = "force-dynamic";

// Word filtering uses Discord's native AutoMod (edited above). These are extra bot-side filters.
const FIELDS = [
  { key: "invites", label: "Block Discord invites", type: "bool" },
  { key: "links", label: "Block all links", type: "bool" },
  { key: "maxMentions", label: "Max mentions per message (0 = off)", numeric: true, placeholder: "5" },
  { key: "action", label: "Action", type: "select", options: ["delete", "timeout", "kick", "ban"] },
  { key: "filterStaff", label: "Also filter staff (people with Manage Messages)", type: "bool", hint: "Off = staff/admins are exempt (default). Turn on to filter everyone — useful for testing." },
  { key: "exemptRoles", label: "Exempt roles (never filtered)", type: "roles" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="ban" title="Automod" subtitle="Edit the server's Discord AutoMod word rules, plus extra bot filters." />
      <AutomodRules />
      <div style={{ marginTop: 16 }}>
        <FeatureSettings feature="automod" title="Extra filters (bot)" description="On top of Discord AutoMod: block invites, links, or too many mentions, then optionally timeout / kick / ban. Members with Manage Messages are exempt. Needs Manage Messages + the Message Content intent." fields={FIELDS} />
      </div>
    </div>
  );
}
