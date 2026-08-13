import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";
import PublishPanel from "../../../components/PublishPanel";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "panels", label: "Panels (one per channel)", type: "list", addLabel: "Add panel", cols: [
    { key: "name", label: "Panel name", placeholder: "main", flex: 0.7 },
    { key: "channel", label: "Channel", type: "channel", flex: 1 },
    { key: "category", label: "Default category", type: "category", flex: 1 },
    { key: "title", label: "Panel title (blank = name)", placeholder: "Support", flex: 0.9 },
    { key: "description", label: "Panel text", placeholder: "Click a button below to open a ticket.", flex: 1.4 },
  ] },
  { key: "buttons", label: "Buttons (assign each to a panel by name)", type: "list", addLabel: "Add ticket type", cols: [
    { key: "panel", label: "Panel", placeholder: "main", flex: 0.6 },
    { key: "label", label: "Button", placeholder: "Support", flex: 0.8 },
    { key: "category", label: "Category (blank = panel's)", type: "category", flex: 1 },
    { key: "roles", label: "Support roles", type: "roles", flex: 1.1 },
    { key: "openMessage", label: "Opening message (blank = default)", placeholder: "Thanks — a staffer will help you.", flex: 1.2 },
    { key: "emoji", label: "Emoji", placeholder: "🎫", flex: 0.4 },
  ] },
  { key: "supportRoles", label: "Support roles (pinged + given access on every ticket)", type: "roles", hint: "These are added on top of any per-button roles above." },
  { key: "openMessage", label: "Default opening message", type: "textarea", rows: 2, placeholder: "Thanks for opening a ticket — a staff member will be with you shortly.", hint: "Used when a button has no opening message of its own. {user} = the opener's mention." },
  { key: "transcriptChannel", label: "Transcript channel (where closed-ticket transcripts are saved)", type: "channel", hint: "Leave blank to fall back to your Logs channel. Blank + no Logs channel = no transcript saved." },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="ticket" title="Tickets" subtitle="Let members open private support tickets. Off until enabled." />
      <FeatureSettings feature="tickets" title="Tickets" description="Make one or more panels — each posts to its own channel with a default category (the panel name becomes its heading). Add buttons and assign each to a panel by name; a button opens tickets in its own category, or the panel's if left blank, with its support roles. Publish (or run /ticketpanel) to post all panels. A Close button saves a transcript and deletes the ticket. One open ticket per member per type. Bot needs Manage Channels." fields={FIELDS} previewMode="tickets" />
      <PublishPanel kind="ticketpanel" title="Publish the panels" label="Publish ticket panels" hint="Posts every configured panel to its channel now — same as running /ticketpanel." />
    </div>
  );
}
