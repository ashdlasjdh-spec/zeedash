import Link from "next/link";
import { Figure, Callout, Tiles, Steps, SpecTable, Pager, Icon } from "../_components";

export const metadata = { title: "Moderation · zhd.lol docs" };

export default function ModerationDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="ban" size={13} /> &nbsp;Moderation</span>
      <h1>Moderation</h1>
      <p className="docs-lede">
        The moderation tools cover in-game enforcement: banning, warning and kicking players, keeping a
        blacklist, looking up someone&apos;s history, and reviewing every staff action in the audit log.
      </p>

      <h2>Tools at a glance</h2>
      <Tiles items={[
        { icon: "ban", title: "Bans", body: "Ban, warn, kick or unban a player, with a reason and optional duration + evidence." },
        { icon: "list", title: "Blacklist", body: "A standing list of players barred from the game." },
        { icon: "search", title: "Lookup", body: "Resolve a Roblox user and pull up their perks, bans and history." },
        { icon: "clock", title: "Audit log", body: "Every grant, ban and config change — who did what, when." },
        { icon: "chart", title: "Analytics", body: "Ban trends and player activity over time." },
        { icon: "trash", title: "Purge", body: "Owner-only bulk data wipes, kept well away from everyday actions." },
      ]} />

      <h2>Banning a player</h2>
      <p>
        The Bans page resolves the target as you type, so you can confirm you have the right person
        before you act. Bans can be permanent or timed, always carry a reason, and can include evidence.
        The list of active bans updates on its own as bans land from the game, the bot, or another
        moderator.
      </p>
      <Figure url="zhd.lol/dashboard/bans" caption={<><b>The Bans page.</b> Live target resolution on the left, the active-ban list on the right — searchable and exportable.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-row" style={{ alignItems: "stretch", gap: 18 }}>
              <div style={{ flex: 1 }}>
                <label>Action</label><div className="m-input" style={{ marginBottom: 12 }}>Ban ▾</div>
                <label>Player</label><div className="m-input mono" style={{ marginBottom: 12 }}>builderman ✓ resolved</div>
                <label>Reason</label><div className="m-input" style={{ marginBottom: 12 }}>Exploiting</div>
                <div className="m-row">
                  <div style={{ flex: 1 }}><label>Duration</label><div className="m-input">7 days</div></div>
                  <button className="m-btn danger">Apply</button>
                </div>
              </div>
              <div style={{ flex: 1.1, borderLeft: "1px solid var(--line)", paddingLeft: 18 }}>
                <div className="m-head"><div className="m-title" style={{ fontSize: 14 }}>Active bans</div><div className="m-sub">2 of 2 shown</div></div>
                <table>
                  <thead><tr><th>Player</th><th>Reason</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr><td className="mono">1234567</td><td>Exploiting</td><td><span className="pill bad">7d left</span></td></tr>
                    <tr><td className="mono">7654321</td><td>Slurs</td><td><span className="pill bad">perma</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Figure>

      <SpecTable
        head={["Action", "Effect", "Reason required"]}
        rows={[
          [<>Ban</>, "Removes the player and blocks re-entry, permanently or for a set time.", "Yes"],
          [<>Warn</>, "Logs a formal warning against the player without removing them.", "Yes"],
          [<>Kick</>, "Boots the player from the current session.", "No"],
          [<>Unban</>, "Lifts an active ban — also available inline on each ban row.", "No"],
        ]}
      />
      <Callout kind="info">
        Bans need <strong>Mod (237+)</strong>. <strong>Bulk bans</strong> — pasting many players at once —
        are reserved for <strong>Leadership (251+)</strong>.
      </Callout>

      <h2>Warning escalation &amp; appeals</h2>
      <p>
        Warnings can escalate on their own: set a threshold with <code>,warnconfig &lt;count&gt; [alert|ban]</code>
        and once a player hits it (and each multiple after) the bot either pings staff to review or
        auto-bans them from the game. Banned players who&apos;ve linked their Roblox account can submit an
        appeal with <code>,appeal &lt;reason&gt;</code>; it posts to the review channel you set with
        <code>,appealchannel</code>, where <b>Accept</b> lifts their ban in-game and DMs them the outcome.
      </p>

      <h2>Looking someone up</h2>
      <p>
        The Lookup page takes a Roblox username or ID and pulls together everything the system knows about
        them: their resolved profile, the perks they currently hold, and their ban history. It&apos;s the
        fastest way to answer &ldquo;what does this player have, and have they been in trouble before?&rdquo;
      </p>
      <Steps items={[
        { title: "Enter a username or ID", body: "The panel resolves it to a Roblox profile and avatar." },
        { title: "Review their perks", body: "See every power, stand, car and pass currently granted to them." },
        { title: "Check their history", body: "Past and active bans and warnings, with reasons and dates." },
        { title: "Act from there", body: "Jump straight to granting, revoking, or banning from what you find." },
      ]} />

      <h2>The audit log</h2>
      <p>
        Nothing happens silently. Every grant, revoke, ban, warn, kick and config change is written to the
        audit log with the staff member, the target, the action, and a timestamp. It&apos;s searchable and
        colour-coded by action, so accountability is built in rather than bolted on.
      </p>
      <Figure url="zhd.lol/dashboard/audit" caption={<><b>The Audit log.</b> A running, filterable record of who did what — the backbone of staff accountability.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div className="m-title">Recent activity</div><div className="m-sub">live</div></div>
            <table>
              <thead><tr><th>Staff</th><th>Action</th><th>Target</th><th>When</th></tr></thead>
              <tbody>
                <tr><td>zee</td><td><span className="pill brand">grant</span></td><td className="mono">builderman · Star Platinum</td><td>2m ago</td></tr>
                <tr><td>lead</td><td><span className="pill bad">ban</span></td><td className="mono">1234567 · Exploiting</td><td>14m ago</td></tr>
                <tr><td>zee</td><td><span className="pill good">unban</span></td><td className="mono">7654321</td><td>1h ago</td></tr>
                <tr><td>admin</td><td><span className="pill brand">revoke</span></td><td className="mono">shedletsky · SVJ Car</td><td>3h ago</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Figure>

      <Callout kind="warn">
        The <strong>Purge</strong> page performs irreversible bulk data wipes and is locked to a dedicated
        list of purge owners — separate from, and stricter than, normal staff levels. Treat it as a
        break-glass tool.
      </Callout>

      <Pager prev={{ href: "/docs/game", title: "Game control" }} next={{ href: "/docs/server", title: "Server management" }} />
    </>
  );
}
