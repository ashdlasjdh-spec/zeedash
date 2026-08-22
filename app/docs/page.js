import Link from "next/link";
import { Figure, Callout, Tiles, Steps, Pager, Icon } from "./_components";
import { SystemDiagram, AuthFlow } from "./_diagrams";

export const metadata = { title: "Overview · zhd.lol docs" };

export default function DocsOverview() {
  return (
    <>
      <span className="docs-kicker"><Icon name="book" size={13} /> &nbsp;Documentation</span>
      <h1>The zhd.lol control panel</h1>
      <p className="docs-lede">
        <strong>zhd.lol</strong> is the staff control panel for the Zee&nbsp;[MACRO!] community — one
        place to hand out in-game perks, moderate players, and configure the Discord server and bot.
        This guide covers every part of the panel, who can use it, and how the pieces fit together.
      </p>

      <div className="hero-stats">
        <div className="hero-stat"><b>2</b><span>portals — Game &amp; Server</span></div>
        <div className="hero-stat"><b>40+</b><span>feature pages</span></div>
        <div className="hero-stat"><b>1</b><span>Discord login</span></div>
      </div>

      <h2>What it does</h2>
      <p>
        The panel is split into two portals that share one login and one permission model. You switch
        between them from the sidebar.
      </p>
      <Tiles items={[
        { icon: "bolt", title: "Game control", body: "Grant powers, stands, cars, tools, gamepasses, crew tags and emojis that show up in the Roblox game." },
        { icon: "ban", title: "Moderation", body: "Ban, warn, kick and unban players; keep a blacklist; look up history; audit every staff action." },
        { icon: "robot", title: "Server management", body: "Configure the Discord bot — automod, welcome, levels, tickets, logging and 30+ more features." },
        { icon: "shield", title: "Access control", body: "A single rank ladder decides what each staff member can see and do, enforced on every request." },
      ]} />

      <h2>How the pieces fit together</h2>
      <p>
        Everything runs off one small stack. The dashboard talks to a Perks API, which owns the grant
        engine and writes to Postgres and to the Roblox game over Open&nbsp;Cloud. The Discord bot shares
        the same database, so a change you make on the panel is the same change the bot and the game see.
      </p>
      <Figure url="zhd.lol — architecture" caption={<><b>The ecosystem.</b> Solid arrows are live requests; dashed arrows are background reads.</>}>
        <SystemDiagram />
      </Figure>
      <Callout kind="info">
        You never touch Roblox or Discord tokens directly. The panel and bot hold them server-side —
        staff only ever sign in with Discord.
      </Callout>

      <h2>Signing in</h2>
      <p>
        There are no passwords. You log in with Discord, and your access level comes from the staff
        whitelist. If you&apos;re not whitelisted, an owner has to add you first.
      </p>
      <Steps items={[
        { title: "Open zhd.lol", body: "You land on the sign-in card. Hit “Continue with Discord”." },
        { title: "Approve on Discord", body: "Discord asks you to authorise the app once. Nothing is posted on your behalf." },
        { title: "You’re matched to a rank", body: "The panel looks you up on the staff whitelist and resolves your level. Everything you can do flows from that number." },
        { title: "Land on your dashboard", body: "You get a signed session cookie and the two portals appear in the sidebar." },
      ]} />
      <Figure url="zhd.lol — login" caption={<><b>The login flow.</b> The <code>state</code> check blocks forged callbacks; the session cookie is signed server-side.</>}>
        <AuthFlow />
      </Figure>

      <Callout kind="warn">
        Getting <em>“You&apos;re not whitelisted”</em>? That&apos;s expected until an owner adds your Discord ID
        on the <Link className="inl" href="/docs/access">Whitelist</Link> page. It isn&apos;t a bug.
      </Callout>

      <h2>Where to go next</h2>
      <Tiles items={[
        { icon: "key", title: "Access & roles", body: "The rank ladder, super owners, and exactly what each level unlocks." },
        { icon: "bolt", title: "Game control", body: "Grant perks, bundles and temporary grants, and how they reach the game." },
        { icon: "ban", title: "Moderation", body: "Bans, blacklist, purge, player lookups and the audit log." },
        { icon: "gear", title: "Server management", body: "Every Discord bot feature, page by page." },
      ]} />

      <Pager next={{ href: "/docs/access", title: "Access & roles" }} />
    </>
  );
}
