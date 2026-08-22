import Link from "next/link";
import { Figure, Callout, Tiles, SpecTable, Pager, Icon } from "../_components";
import { SystemDiagram, GrantFlow } from "../_diagrams";

export const metadata = { title: "How it works · zhd.lol docs" };

export default function ArchitectureDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="layers" size={13} /> &nbsp;Under the hood</span>
      <h1>How it works</h1>
      <p className="docs-lede">
        A quick tour of the stack behind zhd.lol — the moving parts, how they talk to each other, and the
        design choices that keep the panel fast and safe. You don&apos;t need this to use the panel, but it
        helps to know where things live.
      </p>

      <h2>The parts</h2>
      <Tiles items={[
        { icon: "spark", title: "Dashboard (zhd.lol)", body: "A Next.js app — the panel you log into. Server-rendered pages, no data in the browser it shouldn’t have." },
        { icon: "key", title: "Perks API", body: "Owns the grant engine, auth, and the writes to Roblox. The dashboard and bot both call it." },
        { icon: "robot", title: "Zee-hood bot", body: "The Discord.js bot. Shares the database with the panel so both see the same state." },
        { icon: "box", title: "Postgres", body: "The single source of truth — grants, bans, whitelist, and per-server bot config." },
        { icon: "star", title: "Roblox", body: "Grants are pushed into the game’s DataStore over Open Cloud so players get them live." },
        { icon: "users", title: "Discord", body: "OAuth for staff login, plus the guilds, roles and channels the bot manages." },
      ]} />

      <Figure url="zhd.lol — architecture" caption={<><b>One database, many faces.</b> The panel, the bot and the game all read and write the same records, so nothing drifts out of sync.</>}>
        <SystemDiagram />
      </Figure>

      <h2>Why it&apos;s laid out this way</h2>
      <p>
        The key idea is a <strong>shared database</strong>. When you grant a perk on the panel, you&apos;re
        writing the same row the bot reads and the game loads. There&apos;s no message queue to fall behind
        and no &ldquo;sync&rdquo; step that can silently fail — a change is visible everywhere the moment
        it&apos;s written.
      </p>
      <Figure url="zhd.lol — grant flow" caption={<><b>A write, everywhere at once.</b> The grant lands in Postgres and Roblox together; if the game write fails, the whole grant is rejected rather than half-applied.</>}>
        <GrantFlow />
      </Figure>

      <h2>How your session is kept safe</h2>
      <p>
        The panel is staff-only, so a few things run on every request:
      </p>
      <SpecTable
        head={["Guard", "What it protects against"]}
        rows={[
          [<>Discord OAuth + signed cookie</>, "No passwords to leak; the session is signed server-side and can’t be forged."],
          [<>Level checks on every route</>, "The UI hiding a button isn’t the security — the API re-checks your level on the write itself."],
          [<>CSRF origin check</>, "Blocks another site from making state-changing requests with your cookie."],
          [<>Per-IP write rate limit</>, "Stops a flood of writes / brute-force attempts."],
          [<>Strict Content-Security-Policy</>, "Only the app’s own, nonce-signed scripts can run — no injected code."],
        ]}
      />
      <Callout kind="good">
        The rule throughout: <strong>the client is never trusted</strong>. Every capability the UI shows
        is enforced again on the server, keyed to your whitelist level.
      </Callout>

      <h2>Why the panel feels fast</h2>
      <p>
        Pages are server-rendered, so you get real content on first paint instead of a blank shell. On top
        of that, the Server-tab settings and the Whitelist and Bans lists use a small{" "}
        <strong>stale-while-revalidate cache</strong>: the first visit fetches, and every visit after that
        renders instantly from cache while a background refetch keeps it current. That&apos;s why hopping
        between feature pages no longer shows a loading flash.
      </p>

      <h2>The other public pages</h2>
      <p>Not everything needs a login. A few pages are open to anyone:</p>
      <SpecTable
        head={["Page", "Purpose"]}
        rows={[
          [<Link className="inl" href="/">Front page</Link>, "The public landing page with live community stats."],
          [<Link className="inl" href="/catalog">Catalog</Link>, "Browse every grantable item in the game."],
          [<Link className="inl" href="/perks">My perks</Link>, "A player checks what they currently have."],
          [<Link className="inl" href="/preview">Preview</Link>, "See how a crew tag or emoji will render before it goes live."],
          [<Link className="inl" href="/status">Status</Link>, "Live service status."],
          [<Link className="inl" href="/docs">Docs</Link>, "This documentation."],
        ]}
      />

      <Callout kind="info">
        That&apos;s the whole system. If something on the panel behaves unexpectedly, the audit log and the
        status page are the fastest places to start.
      </Callout>

      <Pager prev={{ href: "/docs/automation", title: "Automation & roles" }} next={{ href: "/docs/pages", title: "Every page" }} />
    </>
  );
}
