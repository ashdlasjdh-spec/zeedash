import Link from "next/link";
import { Figure, Callout, SpecTable, Pager, Icon } from "../_components";

export const metadata = { title: "Every page · zhd.lol docs" };

// Small inline mock bar chart for the analytics screenshot.
function MiniBars() {
  const bars = [30, 44, 38, 60, 52, 71, 66, 82, 58, 90, 74, 96];
  return (
    <svg viewBox="0 0 320 120" width="100%" style={{ maxWidth: 380 }} aria-hidden="true">
      {bars.map((h, i) => (
        <rect key={i} x={8 + i * 26} y={110 - h} width="16" height={h} rx="3" fill="url(#pgbar)" />
      ))}
      <defs>
        <linearGradient id="pgbar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff3b30" /><stop offset="1" stopColor="#e01f1f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function PagesReference() {
  return (
    <>
      <span className="docs-kicker"><Icon name="list" size={13} /> &nbsp;Reference</span>
      <h1>Every page</h1>
      <p className="docs-lede">
        A complete tour of the control panel — every page, grouped by portal, with a picture of what it
        looks like and a line on how it works. Many pages share one interface; where they do, it&apos;s shown
        once and the pages that use it are listed.
      </p>

      {/* ---------------- GAME PORTAL ---------------- */}
      <h2>Game portal</h2>
      <p>
        The Game portal hands out everything a player can have in the Roblox game. The seven grant pages all
        share <strong>one interface</strong> — pick an item, enter a player, choose permanent or timed, and
        grant. Only the item list changes from page to page.
      </p>
      <Figure url="zhd.lol/dashboard/powers" caption={<><b>The shared grant interface.</b> Used by Powers, Stands, Cars, Tools, Gamepasses, Shazam and Start BR.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div className="m-title">Grant an item</div><div className="m-sub">3,120 handed out · 214 players</div></div>
            <label>Item</label><div className="m-input" style={{ marginBottom: 14 }}>Star Platinum ▾</div>
            <div className="m-row">
              <div style={{ flex: 1 }}><label>Roblox username</label><div className="m-input mono">builderman</div></div>
              <div style={{ width: 120 }}><label>Duration</label><div className="m-input">Permanent ▾</div></div>
            </div>
            <div className="m-row" style={{ marginTop: 16 }}>
              <button className="m-btn">Grant</button><button className="m-btn ghost">Revoke</button><button className="m-btn ghost">Bulk mode</button>
            </div>
          </div>
        </div>
      </Figure>
      <SpecTable
        head={["Page", "Route", "Grants"]}
        rows={[
          ["Powers", "/dashboard/powers", "Abilities"],
          ["Stands", "/dashboard/stands", "Stands"],
          ["Cars", "/dashboard/car", "Vehicles (SVJ, …)"],
          ["Tools", "/dashboard/tools", "In-game tools"],
          ["Gamepasses", "/dashboard/gamepasses", "Passes"],
          ["Shazam", "/dashboard/shazam", "The Shazam perk"],
          ["Start BR", "/dashboard/startbr", "Battle-Royale start permission"],
        ]}
      />
      <p>Three more Game-portal pages have their own interfaces:</p>
      <Figure url="zhd.lol/dashboard/bundles" caption={<><b>Bundles.</b> Group several items into one named set and grant the whole thing at once.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div className="m-title">Starter bundle</div><div className="m-sub">4 items</div></div>
            <div className="m-row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <span className="pill brand">Star Platinum</span><span className="pill brand">SVJ Car</span><span className="pill brand">Katana</span><span className="pill brand">VIP pass</span>
            </div>
            <div className="m-row"><div style={{ flex: 1 }}><label>Grant to</label><div className="m-input mono">builderman</div></div><button className="m-btn">Grant bundle</button></div>
          </div>
        </div>
      </Figure>
      <SpecTable
        head={["Page", "Route", "What it does"]}
        rows={[
          [<>Bundles</>, "/dashboard/bundles", "Build and grant named item bundles."],
          [<>Temp Grants</>, "/dashboard/temp-grants", <>Live list of timed grants counting down — see <Link className="inl" href="/docs/game">Game control</Link>.</>],
          [<>Crew Tags</>, "/dashboard/tags", <>Custom name tags — full <Link className="inl" href="/docs/crew-tags">Crew tags</Link> deep dive.</>],
          [<>Emojis</>, "/dashboard/emojis", <>Player emoji badges — full <Link className="inl" href="/docs/emojis">Emojis</Link> deep dive.</>],
        ]}
      />

      {/* ---------------- MODERATION ---------------- */}
      <h2>Moderation</h2>
      <p>Enforcement and history tools. Each has its own page:</p>
      <Figure url="zhd.lol/dashboard/audit" caption={<><b>Audit log.</b> Every staff action, colour-coded and searchable — the shape most moderation lists share.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div className="m-title">Recent activity</div><div className="m-sub">live</div></div>
            <table>
              <thead><tr><th>Staff</th><th>Action</th><th>Target</th><th>When</th></tr></thead>
              <tbody>
                <tr><td>zee</td><td><span className="pill brand">grant</span></td><td className="mono">builderman · Star Platinum</td><td>2m</td></tr>
                <tr><td>lead</td><td><span className="pill bad">ban</span></td><td className="mono">1234567 · Exploiting</td><td>14m</td></tr>
                <tr><td>zee</td><td><span className="pill good">unban</span></td><td className="mono">7654321</td><td>1h</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Figure>
      <Figure url="zhd.lol/dashboard/analytics" caption={<><b>Analytics.</b> Ban trends and activity over time, rendered as charts.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div className="m-title">Bans · last 12 days</div><div className="m-sub">trending up</div></div>
            <MiniBars />
          </div>
        </div>
      </Figure>
      <SpecTable
        head={["Page", "Route", "What it does"]}
        rows={[
          [<>Bans</>, "/dashboard/bans", <>Ban/warn/kick/unban with live target resolution — see <Link className="inl" href="/docs/moderation">Moderation</Link>.</>],
          [<>Blacklist</>, "/dashboard/blacklist", "A standing list of players barred from the game."],
          [<>Lookup</>, "/dashboard/lookup", "Resolve a player and pull up their perks + ban history."],
          [<>Audit</>, "/dashboard/audit", "The full, searchable record of staff actions."],
          [<>Analytics</>, "/dashboard/analytics", "Ban trends and player activity charts."],
          [<>Purge</>, "/dashboard/purge", "Owner-only bulk data wipes (break-glass)."],
        ]}
      />
      <Callout kind="warn">
        <strong>Purge</strong> is locked to dedicated purge owners and performs irreversible wipes — it&apos;s
        deliberately separate from everyday moderation.
      </Callout>

      {/* ---------------- SERVER PORTAL ---------------- */}
      <h2>Server portal</h2>
      <p>
        The Server portal configures the Discord bot for the selected server. Three pages stand on their
        own; the rest are feature pages that all share one <strong>toggle-and-configure</strong> layout.
      </p>
      <Figure url="zhd.lol/bot" caption={<><b>Overview.</b> A live summary of what&apos;s enabled for the selected server.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div className="m-title">Zee Hood</div><div className="m-sub">18 features on</div></div>
            <div className="m-row" style={{ flexWrap: "wrap", gap: 8 }}>
              <span className="pill good">Automod</span><span className="pill good">Welcome</span><span className="pill good">Levels</span>
              <span className="pill good">Tickets</span><span className="pill good">Logs</span><span className="pill brand">+13</span>
            </div>
          </div>
        </div>
      </Figure>
      <Figure url="zhd.lol/bot/message-builder" caption={<><b>Message Builder.</b> Compose a rich embed with a live preview, then have the bot post it.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-row" style={{ alignItems: "stretch", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label>Title</label><div className="m-input" style={{ marginBottom: 10 }}>Server rules</div>
                <label>Description</label><div className="m-input" style={{ height: "auto", padding: "10px 12px" }}>Be kind. No spam. Have fun.</div>
              </div>
              <div style={{ flex: 1 }}>
                <label>Preview</label>
                <div className="embed-mock" style={{ maxWidth: "none" }}>
                  <div className="em-title">Server rules</div>
                  <div className="em-desc">Be kind. No spam. Have fun.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Figure>
      <p>
        The <strong>Leaderboard</strong> (<code>/bot/leaderboard</code>) shows the server&apos;s XP
        rankings from the <Link className="inl" href="/docs/levels">Levels</Link> feature.
      </p>
      <h3>Feature pages — one pattern, many features</h3>
      <p>
        Every feature page works the same way: a master on/off toggle, then that feature&apos;s settings. Learn
        it once and you know them all.
      </p>
      <Figure url="zhd.lol/bot/welcome" caption={<><b>The feature-page pattern.</b> Master toggle up top, settings below — identical across all 30+ features.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div><div className="m-title">Welcome</div><div className="m-sub">Greet new members</div></div><span className="m-toggle"><i /></span></div>
            <label>Channel</label><div className="m-input" style={{ marginBottom: 12 }}># welcome ▾</div>
            <div className="m-row"><div style={{ flex: 1 }}><label>Style</label><div className="m-input">Embed ▾</div></div><button className="m-btn">Save</button></div>
          </div>
        </div>
      </Figure>
      <SpecTable
        head={["Group", "Feature pages"]}
        rows={[
          ["Settings", "General · Customize · AutoPFP · Restrict · Disable"],
          ["Security", <>Fake Permissions · Automod · Antiraid · Antinuke · Honeypot — <Link className="inl" href="/docs/security">deep dive</Link></>],
          ["Automation", <>Autoresponder · Autoreact · Autorole · Ping on Join · Tracking — <Link className="inl" href="/docs/automation">deep dive</Link></>],
          ["Utility", "Bump Reminder · Button Roles · Levels · Reaction Roles · Sticky Message"],
          ["Server", "Starboard · Welcome · Goodbye · Aliases · Logs · VoiceMaster · Tickets"],
        ]}
      />

      {/* ---------------- PUBLIC + SETTINGS ---------------- */}
      <h2>Public &amp; account pages</h2>
      <SpecTable
        head={["Page", "Route", "What it does"]}
        rows={[
          [<Link className="inl" href="/">Front page</Link>, "/", "The public landing with live community stats."],
          [<Link className="inl" href="/catalog">Catalog</Link>, "/catalog", "Browse every grantable item."],
          [<Link className="inl" href="/perks">My perks</Link>, "/perks", "A player checks what they own."],
          [<Link className="inl" href="/preview">Preview</Link>, "/preview", "See a crew tag or emoji before it goes live."],
          [<Link className="inl" href="/status">Status</Link>, "/status", "Live service status."],
          [<>Settings</>, "/dashboard/settings", "Your account + backup/restore of server settings."],
          [<Link className="inl" href="/login">Login</Link>, "/login", "The Discord sign-in card for staff."],
        ]}
      />

      <Callout kind="good">
        That&apos;s every page in the panel. For the mechanics behind specific features, jump to the deep
        dives — <Link className="inl" href="/docs/crew-tags">crew tags</Link>,{" "}
        <Link className="inl" href="/docs/security">security</Link>,{" "}
        <Link className="inl" href="/docs/automation">automation</Link> and more.
      </Callout>

      <Pager prev={{ href: "/docs/architecture", title: "How it works" }} next={{ href: "/docs", title: "Back to overview" }} />
    </>
  );
}
