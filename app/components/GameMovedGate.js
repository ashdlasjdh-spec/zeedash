"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// GRANTING moved to its own site — those pages (powers, stands, cars, tools, gamepasses, shazam,
// start-BR, crew tags, emojis, bundles, temp grants) are archived here and show a blurred "moved"
// notice for everyone except super owners. The rest of game management — bans, group, lookup,
// analytics, whitelist/blacklist, settings, audit — stays usable (gated by each page's own perms).
const NEW_HOME = "https://zhd.erased.dev";

// The archived granting routes. A path is covered if it equals or is nested under one of these.
const GRANT_PATHS = [
  "/dashboard/powers", "/dashboard/stands", "/dashboard/car", "/dashboard/tools",
  "/dashboard/gamepasses", "/dashboard/shazam", "/dashboard/startbr", "/dashboard/tags",
  "/dashboard/emojis", "/dashboard/bundles", "/dashboard/temp-grants",
];

export default function GameMovedGate({ superOwner = false }) {
  // Disabled: the "granting moved to zhd.erased.dev" overlay is off. Access to granting/game pages is
  // now controlled purely by each user's permissions (level, Role-Access group, or section grants), so
  // people simply see only what they're allowed. Kept as a no-op so existing imports don't break.
  return null;

  // eslint-disable-next-line no-unreachable
  const path = (usePathname() || "").replace(/\/+$/, "");
  const onGrantPage = GRANT_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  if (superOwner || !onGrantPage) return null;

  return (
    <div className="moved-overlay" role="dialog" aria-modal="true" aria-label="Granting has moved">
      <div className="moved-card">
        <div className="moved-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
        <h2>Granting has moved</h2>
        <p>Powers, stands, cars, tools, gamepasses and the rest of granting now live on a separate site. The rest of game management is still here.</p>
        <a className="moved-btn" href={NEW_HOME} target="_blank" rel="noopener noreferrer">
          Go to zhd.erased.dev
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
        <Link className="moved-alt" href="/dashboard/bans">Go to moderation instead →</Link>
      </div>
    </div>
  );
}
