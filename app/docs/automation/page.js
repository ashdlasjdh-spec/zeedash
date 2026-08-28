import Link from "next/link";
import { Figure, Callout, SpecTable, Pager, Icon } from "../_components";
import { MiniFlow } from "../_diagrams2";

export const metadata = { title: "Automation & roles · zhd.lol docs" };

export default function AutomationDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="gear" size={13} /> &nbsp;Deep dive</span>
      <h1>Automation &amp; roles</h1>
      <p className="docs-lede">
        The rest of the bot&apos;s day-to-day features — self-assign roles, automatic responses, welcomes and
        goodbyes, starboard, sticky messages, bump reminders and temporary voice channels. Each is a small,
        self-contained automation you switch on per server.
      </p>

      <h2>Roles members give themselves</h2>
      <p>Three ways to let members pick their own roles, no staff needed:</p>
      <h3>Autorole</h3>
      <Figure url="autorole — on join" caption={<><b>Automatic on join.</b> Every new member gets the role(s) you choose.</>}>
        <MiniFlow items={[{ t: "Member joins" }, { t: "Autorole", s: "assign configured roles" }]} />
      </Figure>
      <h3>Reaction roles</h3>
      <Figure url="reaction roles — react to toggle" caption={<><b>React to toggle.</b> Adding the reaction grants the role; removing it takes it back.</>}>
        <MiniFlow items={[{ t: "React to a message", s: "chosen emoji" }, { t: "Role granted", s: "un-react removes it" }]} />
      </Figure>
      <h3>Button roles</h3>
      <Figure url="button roles — click to toggle" caption={<><b>Click to toggle.</b> A button panel members tap to add or remove a role.</>}>
        <MiniFlow items={[{ t: "Click a button", s: "role panel" }, { t: "Role toggled", s: "add / remove" }]} />
      </Figure>

      <h2>Automatic responses</h2>
      <h3>Autoresponder</h3>
      <Figure url="autoresponder — trigger reply" caption={<><b>Trigger → reply.</b> When a message matches a trigger phrase, the bot posts your response.</>}>
        <MiniFlow items={[{ t: "Trigger phrase seen" }, { t: "Auto-reply", s: "your configured message" }]} />
      </Figure>
      <h3>Autoreact</h3>
      <Figure url="autoreact — auto reaction" caption={<><b>Trigger → reaction.</b> Matching messages get reactions added automatically.</>}>
        <MiniFlow items={[{ t: "Matching message" }, { t: "Auto-react", s: "adds emoji reactions" }]} />
      </Figure>

      <h2>Welcome &amp; goodbye</h2>
      <p>
        Greet new members and mark departures. Welcome messages support the placeholders{" "}
        <code>{"{user}"}</code>, <code>{"{user.name}"}</code>, <code>{"{server}"}</code> and{" "}
        <code>{"{count}"}</code>, and can post as a branded embed or plain text.
      </p>
      <Figure url="welcome — on join" caption={<><b>Join → greeting.</b> The template is filled in per member, then posted to your welcome channel.</>}>
        <MiniFlow items={[{ t: "Member joins" }, { t: "Fill placeholders", s: "{user} {server} {count}" }, { t: "Post welcome", s: "embed or text" }]} />
      </Figure>
      <Callout kind="info">
        Goodbye works the same way on leave. Both are configured on their own pages under the Server group.
      </Callout>

      <h2>Channel helpers</h2>
      <h3>Starboard</h3>
      <Figure url="starboard — star threshold" caption={<><b>The community pins the best.</b> Once a message hits the star threshold, it&apos;s reposted to the starboard.</>}>
        <MiniFlow items={[{ t: "Message gets", s: "from members" }, { t: "Threshold reached", s: "e.g. 5 stars" }, { t: "Posted to starboard" }]} />
      </Figure>
      <h3>Sticky message</h3>
      <Figure url="sticky — stays at the bottom" caption={<><b>Always visible.</b> The bot re-posts the sticky so it stays at the bottom as chat moves.</>}>
        <MiniFlow items={[{ t: "New messages arrive" }, { t: "Sticky re-posted", s: "stays at the bottom" }]} />
      </Figure>
      <h3>Bump reminder</h3>
      <Figure url="bump — reminder after 2h" caption={<><b>Never forget to bump.</b> After a bump, the bot waits out the cooldown and reminds the server.</>}>
        <MiniFlow items={[{ t: "Someone bumps", s: "Disboard" }, { t: "Wait the cooldown", s: "~2 hours" }, { t: "Reminder posted" }]} />
      </Figure>

      <h2>VoiceMaster</h2>
      <p>
        VoiceMaster gives members their own temporary voice channels. Joining a designated
        &ldquo;join to create&rdquo; channel spins up a private VC the member owns and can rename, lock or
        limit — and it&apos;s cleaned up automatically when everyone leaves.
      </p>
      <Figure url="voicemaster — temp channels" caption={<><b>Member-owned voice.</b> Created on join, controlled by the owner, deleted when empty.</>}>
        <MiniFlow items={[{ t: "Join “create” VC" }, { t: "Temp channel made", s: "member owns it" }, { t: "Deleted when empty" }]} />
      </Figure>

      <SpecTable
        head={["Feature", "Trigger", "Result"]}
        rows={[
          ["Autorole", "Member joins", "Role(s) assigned automatically"],
          ["Reaction roles", "React / un-react", "Role toggled"],
          ["Button roles", "Click a button", "Role toggled"],
          ["Autoresponder", "Trigger phrase", "Bot replies"],
          ["Autoreact", "Matching message", "Reactions added"],
          ["Welcome / Goodbye", "Join / leave", "Message or embed posted"],
          ["Starboard", "Star threshold reached", "Message reposted to starboard"],
          ["Sticky", "New messages", "Sticky kept at the bottom"],
          ["Bump reminder", "After a bump", "Reminder once the cooldown ends"],
          ["VoiceMaster", "Join the create channel", "Temp, member-owned VC"],
        ]}
      />

      <Pager prev={{ href: "/docs/security", title: "Security features" }} next={{ href: "/docs/architecture", title: "How it works" }} />
    </>
  );
}
