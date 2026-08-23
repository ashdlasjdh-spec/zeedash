import { serverSectionUser } from "@/lib/guards";
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

// Honest per-feature notes for the ones that aren't standard toggle features.
const NOTES = {
  customize: "A shared bot has one global profile, so its avatar/banner/bio can't be changed per server. The only per-server option Discord allows is the bot's nickname + role colour — say the word and I'll add those.",
  autopfp: "AutoPFP rotates the bot's avatar, but a shared bot has ONE global avatar for every server — Discord doesn't allow a per-server avatar, so this can't be offered here.",
  tracking: "Username / vanity tracking — on the roadmap.",
  aliases: "Command aliases map to moderation commands the bot doesn't run generically in community servers, so this needs a design pass before it's useful here.",
};

export default async function Page({ params }) {
  const u = await serverSectionUser();
  if (!u) return null;
  const slug = params.feature;
  const title = TITLES[slug] || slug;
  const note = NOTES[slug];
  return (
    <div className="fullbleed">
      <PageHeader icon="gear" title={title} subtitle={note ? "Not a standard toggle — see below." : "Being built — off by default."} />
      <div className="card" style={{ maxWidth: 720 }}>
        <p className="muted" style={{ margin: 0 }}>
          {note || <><b>{title}</b> is on the roadmap. When it ships it&apos;ll appear here as a toggle that&apos;s <b>off by default</b> — the bot does nothing for this feature until you turn it on for a specific server and save.</>}
        </p>
      </div>
    </div>
  );
}
