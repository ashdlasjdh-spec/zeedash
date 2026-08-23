import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";
import PublishPanel from "../../../components/PublishPanel";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel ID", mono: true, placeholder: "123456789012345678", hint: "Where the panel is posted (or pass a channel to /buttonpanel)." },
  { key: "title", label: "Panel title", placeholder: "Roles" },
  { key: "description", label: "Panel description", type: "textarea", rows: 2, placeholder: "Click a button to toggle a role." },
  { key: "buttons", label: "Buttons", type: "list", addLabel: "Add button", cols: [
    { key: "label", label: "Label", placeholder: "Verify", flex: 1 },
    { key: "role", label: "Role", type: "role", flex: 1.3 },
    { key: "style", label: "Style", placeholder: "green / blurple / gray / red", flex: 1 },
    { key: "emoji", label: "Emoji", placeholder: "✅", flex: 0.5 },
  ] },
];

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="shield" title="Button Roles" subtitle="Self-assign roles by clicking buttons. Off until enabled." />
      <FeatureSettings
        feature="buttonroles"
        title="Button roles"
        description="Configure the panel here, then Publish (or run /buttonpanel). Clicking a button toggles the role. Styles: green, blurple, gray, red. Bot needs Manage Roles."
        fields={FIELDS}
        previewMode="buttonroles"
      />
      <PublishPanel kind="buttonpanel" title="Publish the panel" label="Publish button panel" hint="Posts the panel to its channel now — same as running /buttonpanel." />
    </div>
  );
}
