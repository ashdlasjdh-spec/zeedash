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

// Honest per-feature notes for the ones that aren't standard toggle features.
const NOTES = {
  customize: "A shared bot has one global profile, so its avatar/banner/bio can't be changed per server — this isn't possible for this bot.",
  autopfp: "Per-server bot avatars aren't possible for a shared bot (Discord uses one global avatar), so AutoPFP can't be offered here.",
  restrict: "Restricts the bot's own commands to certain channels. This bot only runs a few admin commands in your servers (embeds, panels, tickets) — tell me if you want those channel-restrictable and I'll wire it.",
  disable: "Disables specific bot commands per server. Same note as Restrict — say which commands and I'll add per-guild disabling.",
  tracking: "Username / vanity tracking — on the roadmap.",
  aliases: "Command aliases map to moderation commands the bot doesn't run generically in community servers, so this needs a design pass before it's useful here.",
};

export default async function Page({ params }) {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
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
