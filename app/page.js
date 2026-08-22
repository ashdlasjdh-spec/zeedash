import Link from "next/link";
import "./landing.css";
import { getSession } from "@/lib/session";
import PublicStats from "./components/PublicStats";
import PublicLeaderboard from "./components/PublicLeaderboard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ZHD — Zee Hood",
  description: "The home of Zee Hood: play the game, join the community, and — for staff — run everything from the zhd.lol control panel.",
};

const GAME_URL = "https://www.roblox.com/games/122577517724086/Zee";
const DISCORD_URL = "https://discord.gg/zhd";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
function FIcon({ name }) {
  const paths = {
    bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" {...P} />,
    ban: <><circle cx="12" cy="12" r="9" {...P} /><path d="m5.6 5.6 12.8 12.8" {...P} /></>,
    robot: <><rect x="5" y="7" width="14" height="11" rx="3" {...P} /><path d="M12 3v4M8.5 12h.01M15.5 12h.01M9 16h6" {...P} /></>,
    play: <path d="M8 5v14l11-7L8 5Z" {...P} />,
    discord: <path d="M8 12h.01M16 12h.01M7.5 7.5C9 7 10.5 6.8 12 6.8s3 .2 4.5.7c1.7 2 2.5 4.6 2.5 7.5-1.3 1-2.7 1.7-4 2l-.9-1.6M8.4 15.4c-1.3-.3-2.7-1-4-2 0-2.9.8-5.5 2.5-7.5M8.5 17.5 7.5 19M15.5 17.5l1 1.5" {...P} />,
    book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" {...P} /><path d="M19 3v16" {...P} /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" {...P} /><path d="M8 11V8a4 4 0 0 1 8 0v3" {...P} /></>,
    grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" {...P} /><rect x="13" y="4" width="7" height="7" rx="1.5" {...P} /><rect x="4" y="13" width="7" height="7" rx="1.5" {...P} /><rect x="13" y="13" width="7" height="7" rx="1.5" {...P} /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default async function Landing() {
  const session = await getSession();

  return (
    <div className="land">
      {/* top bar */}
      <header className="land-top">
        <div className="land-inner">
          <Link href="/" className="land-brand"><img src="/zhd-mark.png" alt="" width="30" height="30" />zhd<span>.lol</span></Link>
          <nav className="land-nav">
            <a className="link" href="#stats">Community</a>
            <a className="link" href="#leaderboard">Leaderboard</a>
            <Link className="link" href="/docs">Docs</Link>
            <Link className="link" href="/catalog">Catalog</Link>
            {session
              ? <Link className="land-login" href="/dashboard"><FIcon name="grid" /> Dashboard</Link>
              : <Link className="land-login" href="/login"><FIcon name="lock" /> Staff login</Link>}
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="land-hero">
        <div className="land-inner">
          <img className="land-hero-logo" src="/zhd-mark.png" alt="ZHD" width="132" height="132" />
          <div className="land-hero-kicker">Welcome to Zee Hood</div>
          <h1>zhd<span className="r">.lol</span></h1>
          <p>
            A Roblox game and a community that runs on one platform — the game, the Discord bot, and the
            staff control panel, all under one roof at zhd.lol.
          </p>
          <div className="land-cta">
            <a className="land-btn" href={GAME_URL} target="_blank" rel="noopener noreferrer"><FIcon name="play" /> Play on Roblox</a>
            <a className="land-btn ghost" href={DISCORD_URL} target="_blank" rel="noopener noreferrer"><FIcon name="discord" /> Join the Discord</a>
          </div>
        </div>
      </section>

      {/* public stats */}
      <section className="land-sec" id="stats">
        <div className="land-inner">
          <div className="land-sec-h">
            <span className="kick">Live community</span>
            <h2>The community, by the numbers</h2>
            <p>Every server the bot runs in, updated automatically.</p>
          </div>
          <PublicStats />
        </div>
      </section>

      {/* community leaderboard */}
      <section className="land-sec" id="leaderboard">
        <div className="land-inner">
          <div className="land-sec-h">
            <span className="kick">Leaderboard</span>
            <h2>Most active members</h2>
            <p>The top chatters across the community over the last 30 days.</p>
          </div>
          <div className="lb-wrap">
            <PublicLeaderboard />
          </div>
        </div>
      </section>

      {/* what it does */}
      <section className="land-sec">
        <div className="land-inner">
          <div className="land-sec-h">
            <span className="kick">One platform</span>
            <h2>Everything Zee Hood runs on</h2>
            <p>Built and operated in-house — perks, moderation, and full Discord management.</p>
          </div>
          <div className="land-feat">
            <div className="land-fcard">
              <div className="land-fic"><FIcon name="bolt" /></div>
              <h3>Game perks</h3>
              <p>Powers, stands, cars, gamepasses, crew tags and emojis — granted from the panel and synced straight into the game.</p>
              <ul><li>Permanent or timed grants</li><li>Bundles &amp; bulk actions</li><li>Live in-game sync</li></ul>
            </div>
            <div className="land-fcard">
              <div className="land-fic"><FIcon name="ban" /></div>
              <h3>Moderation</h3>
              <p>Ban, warn, kick and look up any player, with a full audit trail of every staff action across the community.</p>
              <ul><li>Reason + evidence tracking</li><li>Player history lookups</li><li>Complete audit log</li></ul>
            </div>
            <div className="land-fcard">
              <div className="land-fic"><FIcon name="robot" /></div>
              <h3>Server management</h3>
              <p>The Zee Hood Discord bot — automod, welcomes, levels, tickets, logging and 30+ more features, all configured here.</p>
              <ul><li>Automod &amp; anti-raid</li><li>Levels &amp; leaderboards</li><li>Tickets &amp; logging</li></ul>
            </div>
          </div>
        </div>
      </section>

      {/* cta banner */}
      <section className="land-sec">
        <div className="land-inner">
          <div className="land-banner">
            <h2>Are you staff?</h2>
            <p>Sign in with Discord to reach the control panel. Everyone else — come play and join the community.</p>
            <div className="land-cta">
              {session
                ? <Link className="land-btn" href="/dashboard">Open dashboard</Link>
                : <Link className="land-btn" href="/login">Staff login</Link>}
              <Link className="land-btn ghost" href="/docs"><FIcon name="book" /> Read the docs</Link>
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="land-foot">
        <div className="land-inner">
          <Link href="/" className="land-brand"><img src="/zhd-mark.png" alt="" width="26" height="26" />zhd<span>.lol</span></Link>
          <div className="land-foot-links">
            <a href={GAME_URL} target="_blank" rel="noopener noreferrer">Play</a>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Discord</a>
            <Link href="/docs">Docs</Link>
            <Link href="/catalog">Catalog</Link>
            <Link href="/status">Status</Link>
            <Link href="/login">Staff login</Link>
          </div>
          <div className="land-foot-copy">© {new Date().getFullYear()} Zee Hood · zhd.lol</div>
        </div>
      </footer>
    </div>
  );
}
