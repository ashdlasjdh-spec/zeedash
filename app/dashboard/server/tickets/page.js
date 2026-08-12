import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "panelChannel", label: "Panel channel ID", mono: true, placeholder: "123456789012345678", hint: "Where /ticketpanel posts the Open Ticket button." },
  { key: "panelTitle", label: "Panel title", placeholder: "Support" },
  { key: "panelDescription", label: "Panel description", type: "textarea", rows: 2, placeholder: "Click the button below to open a ticket." },
  { key: "buttonLabel", label: "Button label", placeholder: "Open Ticket" },
  { key: "category", label: "Category ID (tickets open here)", mono: true, placeholder: "123456789012345678" },
  { key: "supportRoles", label: "Support role IDs", mono: true, placeholder: "111111111111111111  222222222222222222", hint: "These roles can see + reply to tickets (comma/space separated)." },
  { key: "openMessage", label: "Opening message", type: "textarea", rows: 2, placeholder: "Thanks for opening a ticket — a staff member will be with you shortly." },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="ticket" title="Tickets" subtitle="Let members open private support tickets. Off until enabled." />
      <FeatureSettings feature="tickets" title="Tickets" description="Configure here, then run /ticketpanel in the server to post the panel. Clicking Open Ticket makes a private channel for the member + support roles; a Close button deletes it. Bot needs Manage Channels." fields={FIELDS} />
    </div>
  );
}
