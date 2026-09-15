import Link from "next/link";
import "./landing.css";
import "./home.css";
import { getSession } from "@/lib/session";
import PublicStats from "./components/PublicStats";
import PublicLeaderboard from "./components/PublicLeaderboard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Zee Hood — Your community. Your next move.",
  description: "Play Zee Hood, find your community, explore the catalog and manage your server.",
};
const game = "https://www.roblox.com/games/134743974543044/Zee";
const discord = "https://discord.gg/zhd";
const external = { target: "_blank", rel: "noopener noreferrer" };
function Arrow({ diagonal = false }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16m-6-6 6 6-6 6"} /></svg>;
}
function Mark() {
  return <svg viewBox="0 0 36 36" fill="currentColor" aria-hidden="true"><path d="M6 6h25L16 23h13l-4 7H1L17 13H3z" /></svg>;
}
export default async function Home() {
  const session = await getSession();
  const staff = session ? "/dashboard" : "/login";
  return <div className="zh-home">
    <a className="zh-skip" href="#home-content">Skip to content</a>
    <aside className="zh-rail">
      <Link className="zh-wordmark" href="/" aria-label="Zee Hood home"><Mark /><span>ZEE HOOD<small>COMMUNITY HQ</small></span></Link>
      <div className="zh-rail-label">EXPLORE</div>
      <nav aria-label="Main navigation" className="zh-primary-nav">
        <Link href="/" aria-current="page"><span>01</span> Overview <Arrow /></Link>
        <a href="#community"><span>02</span> Community</a>
        <a href="#leaderboard"><span>03</span> Leaderboard</a>
        <Link href="/catalog"><span>04</span> Catalog <Arrow diagonal /></Link>
      </nav>
      <div className="zh-rail-label">RESOURCES</div>
      <nav aria-label="Resources" className="zh-resource-nav">
        <Link href="/docs/">Documentation <Arrow diagonal /></Link>
        <Link href="/changelog">Changelog <Arrow diagonal /></Link>
        <Link href="/status">Platform status <Arrow diagonal /></Link>
      </nav>
      <div className="zh-rail-bottom"><p>Part of the hood?<br /><strong>Make yourself at home.</strong></p><a href={discord} {...external}>Join the Discord <Arrow diagonal /></a><div className="zh-rail-edition">ZHD / EST. COMMUNITY FIRST</div></div>
    </aside>
    <main id="home-content" className="zh-main">
      <header className="zh-topbar"><span>THE ZEE HOOD NETWORK <i>/</i> OVERVIEW</span><Link href={staff}>{session ? "Open dashboard" : "Staff sign in"} <Arrow diagonal /></Link></header>
      <section className="zh-hero" aria-labelledby="home-title">
        <div className="zh-hero-copy"><div className="zh-eyebrow"><span /> A PLACE TO PLAY. A CREW TO CALL YOUR OWN.</div><h1 id="home-title">YOUR NEXT<br />MOVE STARTS<br /><em>IN THE HOOD.</em></h1><p>The game. The people. Everything in between.<br />Welcome to the home of Zee Hood.</p><div className="zh-actions"><a className="zh-button" href={game} {...external}>Play on Roblox <Arrow diagonal /></a><a className="zh-text-link" href={discord} {...external}>Find your community <Arrow /></a></div></div>
        <div className="zh-poster" aria-label="Zee Hood graphic"><div className="zh-poster-top"><span>ZHD™</span><span>PLAY / CONNECT / BELONG</span></div><div className="zh-poster-mark"><Mark /></div><div className="zh-poster-bottom"><span>NOT JUST<br />ANOTHER SERVER.</span><span>YOUR<br />NEXT CHAPTER. ↗</span></div></div>
      </section>
      <section className="zh-community" id="community" aria-labelledby="community-title"><div className="zh-section-heading"><div><span className="zh-eyebrow">01 / THE COMMUNITY</span><h2 id="community-title">The hood, in real time.</h2></div><p>Real people. Real activity.<br />Select a server to explore its stats.</p></div><PublicStats /></section>
      <div className="zh-content-grid">
        <section className="zh-leaderboard" id="leaderboard"><div className="zh-section-heading"><div><span className="zh-eyebrow">02 / ON THE BOARD</span><h2>People who keep it moving.</h2></div><span className="zh-period">LAST 30 DAYS</span></div><div className="zh-board-labels"><span>MEMBER</span><span>MESSAGES</span></div><PublicLeaderboard /></section>
        <section className="zh-explore"><span className="zh-eyebrow">03 / MAKE IT YOURS</span><h2>More ways<br />to make your mark.</h2><Link className="zh-catalog-link" href="/catalog"><span><small>THE CATALOG</small><strong>Find your<br />next upgrade.</strong></span><Arrow diagonal /></Link><p>Explore powers, stands, cars, gamepasses, crew tags and emojis.</p><Link className="zh-text-link" href="/docs/">Learn how it works <Arrow /></Link></section>
      </div>
      <section className="zh-platform"><div className="zh-section-heading"><div><span className="zh-eyebrow">04 / BEHIND THE SCENES</span><h2>One community. All the controls.</h2></div><Link href="/docs/" className="zh-text-link">Explore the docs <Arrow diagonal /></Link></div><div className="zh-capabilities">{[
        ["01", "Game perks", "Permanent and timed grants, bundles, bulk actions and live in-game sync."],
        ["02", "Moderation", "Player lookups, reasons, evidence, history and a complete staff audit trail."],
        ["03", "Server management", "Automod, anti-raid, welcomes, levels, leaderboards, tickets and logging."],
      ].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="zh-staff"><div><span className="zh-eyebrow">FOR THE PEOPLE BEHIND IT ALL</span><h2>Your community.<br />Under your control.</h2><p>Sign in with Discord to manage Zee Hood from the staff panel.</p></div><Link className="zh-button" href={staff}>{session ? "Open dashboard" : "Staff sign in"} <Arrow diagonal /></Link></section>
      <footer className="zh-footer"><Link href="/" className="zh-footer-brand"><Mark /> ZEE HOOD</Link><nav aria-label="Footer"><a href={game} {...external}>Play</a><a href={discord} {...external}>Discord</a><Link href="/docs/">Docs</Link><Link href="/changelog">Changelog</Link><Link href="/catalog">Catalog</Link><Link href="/status">Status</Link><Link href={staff}>Staff</Link></nav><span>© {new Date().getFullYear()} Zee Hood</span></footer>
    </main>
  </div>;
}
