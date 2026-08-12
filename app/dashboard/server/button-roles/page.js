import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel ID", mono: true, placeholder: "123456789012345678", hint: "Where /buttonpanel posts the panel." },
  { key: "title", label: "Panel title", placeholder: "Roles" },
  { key: "description", label: "Panel description", type: "textarea", rows: 2, placeholder: "Click a button to toggle a role." },
  { key: "buttons", label: "Buttons", type: "list", addLabel: "Add button", cols: [
    { key: "label", label: "Label", placeholder: "Verify", flex: 1 },
    { key: "role", label: "Role ID", placeholder: "123456789012345678", mono: true, flex: 1.3 },
    { key: "style", label: "Style", placeholder: "green / blurple / gray / red", flex: 1 },
    { key: "emoji", label: "Emoji", placeholder: "✅", flex: 0.5 },
  ] },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="shield" title="Button Roles" subtitle="Self-assign roles by clicking buttons. Off until enabled." />
      <FeatureSettings
        feature="buttonroles"
        title="Button roles"
        description="Configure the panel here, then run /buttonpanel in the server to post it (buttons must be on a bot message). Clicking a button toggles the role. Styles: green, blurple, gray, red. Bot needs Manage Roles."
        fields={FIELDS}
      />
    </div>
  );
}
