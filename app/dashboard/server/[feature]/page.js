import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";

export const dynamic = "force-dynamic";

// Fallback for feature slugs whose full config page isn't built yet. Never 404s a nav link; makes
// clear the feature is inert (off) until it ships. Explicit routes (welcome, goodbye, …) win over this.
const TITLES = {
  "message-builder": "Message Builder", "settings-general": "General", customize: "Customize", autopfp: "AutoPFP",
  restrict: "Restrict", disable: "Disable", "fake-permissions": "Fake Permissions", automod: "Automod",
  antiraid: "Antiraid", antinuke: "Antinuke", honeypot: "Honeypot", autoresponder: "Autoresponder",
  autoreact: "Autoreact", autorole: "Autorole", pingonjoin: "Ping on Join", tracking: "Tracking",
  bump: "Bump Reminder", "button-roles": "Button Roles", levels: "Levels", "reaction-roles": "Reaction Roles",
  sticky: "Sticky Message", starboard: "Starboard", aliases: "Aliases", logs: "Logs", voicemaster: "VoiceMaster",
  tickets: "Tickets",
};

export default async function Page({ params }) {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  const slug = params.feature;
  const title = TITLES[slug] || slug;
  return (
    <div className="fullbleed">
      <PageHeader icon="gear" title={title} subtitle="Being built — off by default." />
      <div className="card" style={{ maxWidth: 720 }}>
        <p className="muted" style={{ margin: 0 }}>
          <b>{title}</b> is on the roadmap. When it ships it&apos;ll appear here as a toggle that&apos;s <b>off by default</b> —
          the bot does nothing for this feature until you turn it on for a specific server and save its settings.
        </p>
      </div>
    </div>
  );
}
