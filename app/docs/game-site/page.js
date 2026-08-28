import { Callout, Tiles, Steps, SpecTable, Pager, Icon } from "../_components";

export const metadata = { title: "Game Site editor · zhd.lol docs" };

export default function GameSiteDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="bolt" size={13} /> &nbsp;Deep dive</span>
      <h1>Editing the game site (zeehood.org)</h1>
      <p className="docs-lede">
        The public marketing site at <strong>zeehood.org</strong> is edited entirely from the panel —
        no code, no redeploy. The <strong>Game&nbsp;Site</strong> page owns the live player stats,
        the announcement banner, the store lists, and every link the site shows.
      </p>

      <h2>Where it lives</h2>
      <p>
        Open <strong>zhd.lol → Game&nbsp;Site</strong> in the sidebar (it&apos;s a super-owner page).
        Change any field, hit <strong>Save</strong>, and the change is pushed straight to zeehood.org.
      </p>
      <Callout kind="info">
        Only super owners see the Game&nbsp;Site page — it edits a public website, so it&apos;s kept to
        the top of the ladder. Everything else in the panel is unaffected.
      </Callout>

      <h2>What you can change</h2>
      <SpecTable
        head={["Field", "What it controls"]}
        rows={[
          ["Hero title", "The big headline at the top of the landing page."],
          ["Tagline", "The one-line subtitle under the title."],
          ["Announcement", "An optional banner across the top — leave it empty to hide it."],
          ["Game link", "The “Play” button target (the Roblox game URL)."],
          ["Place ID", "The Roblox place the site reads live players, visits and screenshots from."],
          ["Discord link", "The “Join Discord” button target."],
          ["Live stats", "Toggle the live player-count / visits bar on or off."],
          ["Buy label + note", "The wording on the purchase buttons and the note beside them."],
          ["Socials", "Extra link rows shown in the footer (label + URL)."],
          ["Gamepasses / Powers / Roles / Shop", "The store lists shown on each section page — name and price rows."],
        ]}
      />

      <h2>How a save reaches the site</h2>
      <Steps items={[
        { title: "You save", body: "The panel writes the change to the shared config the whole ecosystem reads." },
        { title: "It publishes", body: "zeehood.org fetches that config (cached ~60s) and a save also pings the site to refresh immediately, so changes show within seconds." },
        { title: "It always renders", body: "If a list is ever empty or the fetch fails, the site falls back to its built-in defaults — it never shows a blank page." },
      ]} />

      <Callout kind="good">
        Editing a role, power or shop item also updates its little preview on the landing page
        automatically — the home-page teasers are derived from the same lists.
      </Callout>

      <h2>Good to know</h2>
      <Tiles items={[
        { icon: "bolt", title: "Live numbers are automatic", body: "Player count, visits and in-game screenshots come straight from Roblox using the Place ID — you don’t enter them by hand." },
        { icon: "shield", title: "Safe to experiment", body: "There’s a built-in fallback for every field, so a bad or blank value can’t take the site down." },
        { icon: "gear", title: "One source of truth", body: "The same config powers the site and the panel, so what you see when editing is what visitors get." },
      ]} />

      <Pager prev={{ href: "/docs/tickets", title: "Tickets" }} next={{ href: "/docs/staff-sync", title: "Staff Sync" }} />
    </>
  );
}
