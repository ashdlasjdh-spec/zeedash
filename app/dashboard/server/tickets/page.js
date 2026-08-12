import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "panelChannel", label: "Panel channel ID", mono: true, placeholder: "123456789012345678", hint: "Where /ticketpanel posts the buttons." },
  { key: "panelTitle", label: "Panel title", placeholder: "Support" },
  { key: "panelDescription", label: "Panel description", type: "textarea", rows: 2, placeholder: "Pick a category below to open a ticket." },
  { key: "buttons", label: "Ticket buttons (one per type)", type: "list", addLabel: "Add ticket type", cols: [
    { key: "label", label: "Button label", placeholder: "Support", flex: 1 },
    { key: "category", label: "Category ID", placeholder: "123…", mono: true, flex: 1.2 },
    { key: "roles", label: "Support role IDs", placeholder: "111, 222", mono: true, flex: 1.3 },
    { key: "emoji", label: "Emoji", placeholder: "🎫", flex: 0.5 },
  ] },
  { key: "openMessage", label: "Opening message", type: "textarea", rows: 2, placeholder: "Thanks for opening a ticket — a staff member will be with you shortly." },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="ticket" title="Tickets" subtitle="Let members open private support tickets. Off until enabled." />
      <FeatureSettings feature="tickets" title="Tickets" description="Add one button per ticket type — each with its own category and support roles. Run /ticketpanel to post them. Clicking a button opens a private channel in that button's category for the member + its roles; a Close button deletes it. A member can have one open ticket per type. Bot needs Manage Channels." fields={FIELDS} />
    </div>
  );
}
