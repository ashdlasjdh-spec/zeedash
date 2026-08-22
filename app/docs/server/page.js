import Link from "next/link";
import { Figure, Callout, Steps, SpecTable, Pager, Icon } from "../_components";

export const metadata = { title: "Server management · zhd.lol docs" };

export default function ServerDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="robot" size={13} /> &nbsp;Server portal</span>
      <h1>Server management</h1>
      <p className="docs-lede">
        The Server portal configures the Zee-hood Discord bot for a specific server. Pick a guild from the
        top of the sidebar and every page below configures the bot <em>for that server</em> — moderation,
        automation, roles, logging, welcomes and more.
      </p>

      <h2>Picking a server</h2>
      <p>
        At the top of the Server sidebar is the server picker. Whatever guild is selected there is the one
        every feature page reads and writes. The sidebar only shows the servers you can manage, and within
        a server it only shows the features your role unlocks.
      </p>
      <Callout kind="info">
        Changes save per server and take effect immediately — the bot reads the same settings store the
        panel writes to, so there&apos;s no deploy or restart step.
      </Callout>

      <h2>How a feature page works</h2>
      <p>
        Most features follow the same shape: a master on/off toggle, then the settings for that feature.
        Flip it on, fill in the fields, and it saves. The Overview page summarises what&apos;s enabled at a
        glance.
      </p>
      <Figure url="zhd.lol/dashboard/server/welcome" caption={<><b>A feature page.</b> One master toggle up top, feature settings below — the same pattern across all 30+ features.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head">
              <div><div className="m-title">Welcome</div><div className="m-sub">Greet new members with a message or embed</div></div>
              <span className="m-toggle"><i /></span>
            </div>
            <label>Channel</label><div className="m-input" style={{ marginBottom: 14 }}># welcome ▾</div>
            <label>Message</label>
            <div className="m-input" style={{ marginBottom: 14, height: "auto", padding: "10px 12px" }}>
              Hey {"{user}"} — welcome to <b>{"{server}"}</b>! You&apos;re member <b>#{"{count}"}</b>.
            </div>
            <div className="m-row">
              <div style={{ flex: 1 }}><label>Style</label><div className="m-input">Embed ▾</div></div>
              <button className="m-btn">Save</button>
            </div>
          </div>
        </div>
      </Figure>
      <p>
        Placeholders like <code>{"{user}"}</code>, <code>{"{user.name}"}</code>, <code>{"{server}"}</code>{" "}
        and <code>{"{count}"}</code> are filled in per member when the bot posts. The bot&apos;s embeds are
        brand-styled automatically:
      </p>
      <Figure url="Discord — #welcome" caption={<><b>What members see.</b> A clean, branded welcome embed with the new member&apos;s avatar.</>}>
        <div className="mock">
          <div className="embed-mock">
            <div className="em-author">Zee [MACRO!]</div>
            <div className="em-title">Welcome to Zee [MACRO!]</div>
            <div className="em-desc">Hey @newmember — welcome to <b>Zee [MACRO!]</b>! You&apos;re member <b>#1,204</b>. Glad to have you here.</div>
            <div className="em-foot">Welcome</div>
          </div>
        </div>
      </Figure>

      <h2>Every feature</h2>
      <p>The Server portal groups its features the same way the sidebar does:</p>

      <h3>Settings</h3>
      <SpecTable head={["Feature", "What it does"]} rows={[
        ["General", "Core per-server settings — prefix and base configuration."],
        ["Customize", "Branding for the bot’s embeds and responses in this server."],
        ["AutoPFP", "Automatic profile-picture handling."],
        ["Restrict", "Limit who can run which commands."],
        ["Disable", "Turn individual commands off in this server."],
      ]} />

      <h3>Security</h3>
      <SpecTable head={["Feature", "What it does"]} rows={[
        [<>Fake Permissions</>, "Grant command access via roles without real Discord permissions."],
        ["Automod", "Rules that auto-moderate messages (spam, links, words)."],
        ["Antiraid", "Detect and stop coordinated join raids."],
        ["Antinuke", "Guard against mass-delete / mass-ban nuke attempts."],
        ["Honeypot", "Trap channels that catch and action bad actors."],
      ]} />
      <Callout kind="warn">
        <strong>Antinuke</strong> and <strong>Antiraid</strong> only appear for the server owner or its
        antinuke admins — they&apos;re hidden from everyone else, even other staff.
      </Callout>
      <p>
        Want the mechanics? See the <Link className="inl" href="/docs/security">Security features</Link>{" "}
        deep dive — how automod, antiraid, antinuke, honeypot and fake permissions each work.
      </p>

      <h3>Automation</h3>
      <SpecTable head={["Feature", "What it does"]} rows={[
        ["Autoresponder", "Reply automatically to trigger phrases."],
        ["Autoreact", "Add reactions to matching messages automatically."],
        ["Autorole", "Assign roles to members on join."],
        ["Ping on Join", "Ping a channel or role when someone joins."],
        ["Tracking", "Track member and message activity."],
      ]} />
      <p>
        How each of these fires is covered in the{" "}
        <Link className="inl" href="/docs/automation">Automation &amp; roles</Link> deep dive — autorole,
        reaction/button roles, autoresponders, welcome/goodbye, starboard, sticky, bump and VoiceMaster.
      </p>

      <h3>Utility</h3>
      <SpecTable head={["Feature", "What it does"]} rows={[
        ["Bump Reminder", "Remind the server to bump on Disboard."],
        ["Button Roles", "Self-assign roles from buttons."],
        ["Reaction Roles", "Self-assign roles from reactions."],
        ["Levels", "XP and leveling with a public leaderboard."],
        ["Sticky Message", "Keep a message pinned to the bottom of a channel."],
      ]} />

      <h3>Server</h3>
      <SpecTable head={["Feature", "What it does"]} rows={[
        ["Starboard", "Highlight popular messages in a starboard channel."],
        ["Welcome", "Greet new members with a message or embed."],
        ["Goodbye", "Post when a member leaves."],
        ["Aliases", "Custom command aliases."],
        ["Logs", "Log edits, deletes, joins, leaves and mod actions."],
        ["VoiceMaster", "Temporary, member-owned voice channels."],
        ["Tickets", "A support-ticket system."],
      ]} />

      <h2>Message Builder &amp; Leaderboard</h2>
      <p>
        Two standalone tools sit above the groups. The <strong>Message Builder</strong> composes rich embed
        messages for the bot to post — titles, fields, colours and buttons — with a live preview. The{" "}
        <strong>Leaderboard</strong> shows the server&apos;s XP rankings driven by the Levels feature.
      </p>
      <Steps items={[
        { title: "Open the Server portal", body: "Switch to Server in the sidebar and pick your guild in the server picker." },
        { title: "Choose a feature", body: "Navigate the grouped sidebar — Settings, Security, Automation, Utility, Server." },
        { title: "Toggle & configure", body: "Flip the master switch on, set the fields, and save. It applies to the bot right away." },
        { title: "Confirm on Overview", body: "The Overview page lists what’s enabled so you can see the whole server’s setup at once." },
      ]} />

      <Pager prev={{ href: "/docs/moderation", title: "Moderation" }} next={{ href: "/docs/architecture", title: "How it works" }} />
    </>
  );
}
