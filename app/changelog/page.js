import Link from "next/link";
import { getChangelog } from "@/lib/changelog.mjs";

// Public "what's new" feed. ISR-cached; pulls from the repos' public commit history.
export const revalidate = 600;
export const metadata = {
  title: "Changelog",
  description: "What's new across Zee Hood — the bot, dashboard, game site, transcripts and perks API.",
};

const TONE = {
  "Zee-hood": "bot",
  zeedash: "dash",
  "zee-hood-game": "game",
  "zee-hood-transcript": "ts",
  idkutoldmetomakeit: "api",
};

function niceDate(day) {
  if (!day || day === "unknown") return "Earlier";
  try {
    return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  } catch { return day; }
}

export default async function ChangelogPage() {
  const groups = await getChangelog();
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <main className="cl-wrap">
      <div className="cl-glow" />
      <header className="cl-head">
        <Link className="cl-back" href="/">← zhd.lol</Link>
        <span className="cl-kicker">Product updates</span>
        <h1>Changelog</h1>
        <p>Everything new across Zee Hood — the bot, dashboard, game site, transcripts and perks API. Updated automatically as work ships.</p>
      </header>

      {total === 0 ? (
        <p className="cl-empty">No recent updates to show right now — check back soon.</p>
      ) : (
        <div className="cl-timeline">
          {groups.map((g) => (
            <section className="cl-day" key={g.day}>
              <h2 className="cl-date">{niceDate(g.day)}</h2>
              <ul className="cl-list">
                {g.items.map((it, i) => (
                  <li className="cl-item" key={i}>
                    <span className={`cl-tag cl-tag-${TONE[it.repo] || "dash"}`}>{it.label}</span>
                    {it.url ? (
                      <a className="cl-text" href={it.url} target="_blank" rel="noopener noreferrer">{it.text}</a>
                    ) : (
                      <span className="cl-text">{it.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <footer className="cl-foot">
        <Link className="inl" href="/docs">Docs</Link> · <Link className="inl" href="/bot/commands">Commands</Link> · <Link className="inl" href="/status">Status</Link>
      </footer>
    </main>
  );
}
