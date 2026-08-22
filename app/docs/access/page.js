import Link from "next/link";
import { Figure, Callout, Steps, SpecTable, Pager, Icon } from "../_components";
import { PermissionLadder } from "../_diagrams";

export const metadata = { title: "Access & roles · zhd.lol docs" };

export default function AccessDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="key" size={13} /> &nbsp;Access</span>
      <h1>Access &amp; roles</h1>
      <p className="docs-lede">
        One number decides everything you can do on the panel: your <strong>level</strong>. It comes from
        the staff whitelist, and every page and API route checks it before doing anything.
      </p>

      <h2>The rank ladder</h2>
      <p>
        Higher levels unlock more. The ladder runs from staff (level&nbsp;1) up to founders (255), with a
        separate band for chat-moderation roles. A handful of hard-coded <strong>super owners</strong> sit
        above the ladder entirely and bypass every check.
      </p>
      <Figure url="zhd.lol — permission ladder" caption={<><b>What each band unlocks.</b> Levels are additive — a higher rank keeps everything the ranks below it can do.</>}>
        <PermissionLadder />
      </Figure>

      <Callout kind="warn">
        <strong>Super owners</strong> are wired into both the panel and the bot in code, so they always
        have full control even if the whitelist is wrong. That list is deliberately tiny and only an
        engineer can change it — it isn&apos;t editable from the UI.
      </Callout>

      <h2>What the levels gate</h2>
      <p>These are the main capability thresholds the panel enforces:</p>
      <SpecTable
        head={["Capability", "Needs", "Where"]}
        rows={[
          [<>Ban / warn / kick</>, "Mod (237+)", <><Link className="inl" href="/docs/moderation">Bans</Link></>],
          [<>Bulk bans</>, "Leadership (251+)", "Bans → bulk"],
          [<>Manage grants</>, "Co-founders (254)", <><Link className="inl" href="/docs/game">Game portal</Link></>],
          [<>Whitelist staff</>, "Co-founders (254)", "Whitelist"],
          [<>Crew tags &amp; emojis</>, "Co-founders (254)", "Tags · Emojis"],
          [<>Full server config</>, "Leadership (251+)", <><Link className="inl" href="/docs/server">Server portal</Link></>],
          [<>Purge / wipe data</>, "Purge owners only", "Purge"],
          [<>Everything, always</>, "Super owner", "All pages"],
        ]}
      />

      <h2>The staff whitelist</h2>
      <p>
        The whitelist is the source of truth for who is staff and at what level. You add a Discord user
        ID, pick a level (you can only assign at or below your own), and optionally leave a note. Removing
        someone revokes their panel access immediately.
      </p>

      <Figure url="zhd.lol/dashboard/whitelist" caption={<><b>The Whitelist page.</b> Add or update in one row; the table lists everyone with their level and who added them.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-row" style={{ marginBottom: 18 }}>
              <div style={{ flex: 1 }}><label>Discord user id</label><div className="m-input mono">1145835584112308294</div></div>
              <div style={{ width: 150 }}><label>Level</label><div className="m-input">admin (240)</div></div>
              <button className="m-btn">Add / update</button>
            </div>
            <table>
              <thead><tr><th>Discord ID</th><th>Level</th><th>Note</th><th>By</th><th /></tr></thead>
              <tbody>
                <tr><td className="mono">562438384350527489</td><td><span className="pill brand">founders (255)</span></td><td>—</td><td>system</td><td><button className="m-btn danger" style={{ padding: "5px 10px", fontSize: 11 }}>Remove</button></td></tr>
                <tr><td className="mono">1226516379881046027</td><td><span className="pill brand">co founders (254)</span></td><td>lead</td><td>zee</td><td><button className="m-btn danger" style={{ padding: "5px 10px", fontSize: 11 }}>Remove</button></td></tr>
                <tr><td className="mono">183605754593411072</td><td><span className="pill brand">admin (240)</span></td><td>—</td><td>zee</td><td><button className="m-btn danger" style={{ padding: "5px 10px", fontSize: 11 }}>Remove</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Figure>

      <Steps items={[
        { title: "Get the Discord ID", body: "Turn on Developer Mode in Discord, right-click the user, and Copy User ID." },
        { title: "Add & pick a level", body: "Paste the ID, choose a level at or below your own, add a note if useful, and hit Add / update." },
        { title: "They can sign in", body: "The next time they open zhd.lol and log in with Discord, they’re matched to that level." },
        { title: "Remove to revoke", body: "Hitting Remove drops them from the whitelist and they lose panel access on their next request." },
      ]} />

      <Callout kind="good">
        Access is also enforced <strong>per Discord server</strong> for the Server portal. Even a
        whitelisted staffer only sees the bot features they can actually manage in that specific guild —
        the sidebar hides the rest.
      </Callout>

      <h2>Per-server access</h2>
      <p>
        The Server portal layers Discord&apos;s own permissions on top of your panel level. Security features
        like <strong>Antinuke</strong> and <strong>Antiraid</strong> only appear for a guild&apos;s owner or its
        designated antinuke admins. Staff with manual per-feature permissions see exactly the features
        they were granted and nothing else. The panel shows you what you can touch; the server enforces
        it again on every save.
      </p>

      <Pager prev={{ href: "/docs", title: "Overview" }} next={{ href: "/docs/game", title: "Game control" }} />
    </>
  );
}
