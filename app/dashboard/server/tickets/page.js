import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "panels", label: "Panels (one per channel)", type: "list", addLabel: "Add panel", cols: [
    { key: "name", label: "Panel name", placeholder: "main", flex: 0.8 },
    { key: "channel", label: "Channel", type: "channel", flex: 1.1 },
    { key: "title", label: "Title", placeholder: "Support", flex: 1 },
    { key: "description", label: "Description", placeholder: "Pick an option below…", flex: 1.4 },
  ] },
  { key: "buttons", label: "Buttons (assign each to a panel by name)", type: "list", addLabel: "Add ticket type", cols: [
    { key: "panel", label: "Panel", placeholder: "main", flex: 0.6 },
    { key: "label", label: "Button", placeholder: "Support", flex: 0.9 },
    { key: "category", label: "Category", type: "category", flex: 1.1 },
    { key: "roles", label: "Support roles", type: "roles", flex: 1.3 },
    { key: "emoji", label: "Emoji", placeholder: "🎫", flex: 0.4 },
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
      <FeatureSettings feature="tickets" title="Tickets" description="Make one or more panels (each posts to its own channel), then add buttons and assign each to a panel by name. Every button has its own category + support roles. Run /ticketpanel once to post all panels. Clicking a button opens a private channel in that button's category; a Close button deletes it. One open ticket per member per type. Bot needs Manage Channels." fields={FIELDS} />
    </div>
  );
}
