import Link from "next/link";
import { Figure, Callout, Tiles, Steps, SpecTable, Pager, Icon } from "../_components";
import { GrantFlow } from "../_diagrams";

export const metadata = { title: "Game control · zhd.lol docs" };

export default function GameDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="bolt" size={13} /> &nbsp;Game portal</span>
      <h1>Game control</h1>
      <p className="docs-lede">
        The Game portal hands out everything a player can have in the Roblox game — abilities, stands,
        vehicles, tools, passes, crew tags and emojis. Grants are looked up by Roblox username, can be
        permanent or timed, and sync to the game automatically.
      </p>

      <h2>What you can grant</h2>
      <Tiles items={[
        { icon: "bolt", title: "Powers", body: "Abilities a player can use in-game. Grant one, several, or an all-powers bundle." },
        { icon: "star", title: "Stands", body: "Assign a stand to a player’s account." },
        { icon: "car", title: "Cars", body: "Vehicles like the SVJ, unlocked per player." },
        { icon: "wrench", title: "Tools", body: "In-game tools and utilities." },
        { icon: "ticket", title: "Gamepasses", body: "Grant passes without the player buying them." },
        { icon: "bolt", title: "Shazam", body: "The Shazam perk, granted on its own page." },
        { icon: "flag", title: "Start BR", body: "Permission to start a Battle Royale round." },
        { icon: "tag", title: "Crew tags", body: "Custom name tags shown next to a player." },
        { icon: "smile", title: "Emojis", body: "Custom emojis tied to a player or crew." },
      ]} />

      <h2>How a grant works</h2>
      <p>
        Every page in this portal shares the same flow. You pick an item, type a Roblox username, choose
        permanent or a duration, and grant. The Perks API checks your level, writes the record to
        Postgres, and pushes the change straight into the game&apos;s DataStore over Open&nbsp;Cloud — so the
        player has it the next time they join (or immediately if they&apos;re already in).
      </p>
      <Figure url="zhd.lol — grant flow" caption={<><b>A grant, end to end.</b> If the in-game write fails on a grant, nothing is saved — you get an error instead of a half-applied perk.</>}>
        <GrantFlow />
      </Figure>

      <Figure url="zhd.lol/dashboard/powers" caption={<><b>A grant page.</b> Pick an item, enter the player, set a duration, and grant — or flip to bulk mode to paste a list.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head">
              <div className="m-title">Grant a power</div>
              <div className="m-sub">3,120 handed out · 214 players</div>
            </div>
            <label>Power</label>
            <div className="m-input" style={{ marginBottom: 14 }}>Star Platinum ▾</div>
            <div className="m-row">
              <div style={{ flex: 1 }}><label>Roblox username</label><div className="m-input mono">builderman</div></div>
              <div style={{ width: 96 }}><label>Amount</label><div className="m-input">1</div></div>
              <div style={{ width: 120 }}><label>Duration</label><div className="m-input">Permanent ▾</div></div>
            </div>
            <div className="m-row" style={{ marginTop: 16 }}>
              <button className="m-btn">Grant</button>
              <button className="m-btn ghost">Revoke</button>
              <button className="m-btn ghost">Bulk mode</button>
            </div>
          </div>
        </div>
      </Figure>

      <Steps items={[
        { title: "Pick the item", body: "Choose the power / stand / car / pass from the list on the page." },
        { title: "Enter the Roblox username", body: "The panel resolves it to a Roblox ID; a bad username fails fast instead of granting nothing." },
        { title: "Permanent or timed", body: "Leave it permanent, or set a duration (minutes → weeks) to make it a temporary grant." },
        { title: "Grant", body: "The perk is written to the database and the game. Revoke on the same page takes it back." },
      ]} />

      <h2>Temporary grants</h2>
      <p>
        Setting a duration turns a grant into a <strong>temporary grant</strong>. The panel records an
        expiry, and a background sweeper automatically revokes it when the time is up — no need to
        remember to take it back. The <Link className="inl" href="/docs/game">Temp Grants</Link> page lists
        everything currently ticking down with its remaining time.
      </p>
      <Figure url="zhd.lol/dashboard/temp-grants" caption={<><b>Temp Grants.</b> Everything on a timer, newest first, with a live countdown and one-click revoke.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div className="m-title">Expiring grants</div><div className="m-sub">3 active</div></div>
            <table>
              <thead><tr><th>Player</th><th>Item</th><th>Expires</th><th /></tr></thead>
              <tbody>
                <tr><td className="mono">builderman</td><td>Star Platinum</td><td><span className="pill brand">in 5h 12m</span></td><td><button className="m-btn danger" style={{ padding: "5px 10px", fontSize: 11 }}>Revoke now</button></td></tr>
                <tr><td className="mono">stickmasterluke</td><td>SVJ Car</td><td><span className="pill brand">in 2d 3h</span></td><td><button className="m-btn danger" style={{ padding: "5px 10px", fontSize: 11 }}>Revoke now</button></td></tr>
                <tr><td className="mono">shedletsky</td><td>The World</td><td><span className="pill bad">in 41m</span></td><td><button className="m-btn danger" style={{ padding: "5px 10px", fontSize: 11 }}>Revoke now</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Figure>

      <h2>Bundles &amp; bulk grants</h2>
      <p>
        Two ways to move fast:
      </p>
      <SpecTable
        head={["Tool", "What it does", "Where"]}
        rows={[
          [<>Bulk mode</>, "Paste a list of usernames and grant the same item to all of them at once.", "Any grant page"],
          [<>Bundles</>, "Group several items into one named bundle and grant the whole set in a single action.", "Bundles"],
          [<>Sweep</>, "Force-revoke expired temp grants immediately instead of waiting for the sweeper.", "Temp Grants"],
        ]}
      />

      <Callout kind="warn">
        Grants are gated at <strong>co-founders (254)</strong> and above. Lower ranks can view the pages
        but the Grant / Revoke buttons are disabled — the API rejects the write regardless of the UI.
      </Callout>

      <h2>Crew tags &amp; emojis</h2>
      <p>
        Crew tags are the custom, colored name tags that render above a player, and emojis are badges
        pinned next to their name. Both live in the Game portal and both are gated at co-founders. They
        each get a full walkthrough of their own:
      </p>
      <Tiles items={[
        { icon: "tag", title: "Crew tags →", body: "Text, gradients, icons and animation, scoped per group or rank. See the Crew tags deep dive." },
        { icon: "smile", title: "Emojis →", body: "Assign unicode emoji to a player with set / add / remove. See the Emojis deep dive." },
      ]} />
      <p>
        Full guides: <Link className="inl" href="/docs/crew-tags">Crew tags</Link> ·{" "}
        <Link className="inl" href="/docs/emojis">Emojis</Link>. You can also{" "}
        <Link className="inl" href="/preview">preview</Link> either before it goes live.
      </p>

      <h2>Verification &amp; redeem codes</h2>
      <p>
        Members link their Roblox account with <code>,verify &lt;username&gt;</code> (a one-time code in their
        Roblox profile — no passwords). Once linked, the bot can sync their Discord roles from their group
        rank automatically, and they can claim perk bundles: staff generate a code with{" "}
        <code>,redeemcode create powers:Batman armor:50 uses:10</code> and players run{" "}
        <code>,redeem &lt;code&gt;</code> to receive those perks in-game — one claim each, respecting the
        code&apos;s use limit and expiry. Every member command is listed on the{" "}
        <Link className="inl" href="/bot/commands">commands page</Link>.
      </p>

      <h2>Editing the public game site</h2>
      <p>
        The public game site at <Link className="inl" href="https://zeehood.org">zeehood.org</Link> is
        editable from the dashboard under <strong>Site → Game Site</strong> (super owners only). You can
        change the Roblox game link, the Discord invite, the place ID (which drives the live player count
        and screenshots), and the game&nbsp;passes, staff&nbsp;roles, shop&nbsp;items and powers lists —
        each as add/remove rows. Saved changes appear on the live site within about a minute, and the site
        keeps its built-in values as a fallback so it always renders even if the dashboard is unreachable.
      </p>

      <Pager prev={{ href: "/docs/access", title: "Access & roles" }} next={{ href: "/docs/moderation", title: "Moderation" }} />
    </>
  );
}
