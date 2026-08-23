"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Game management on zhd.lol is now super-owner-only — everyone else gets a blurred
// "moved" notice pointing at the new home. Only covers the GAME portal (/dashboard/*);
// the bot dashboard (/bot/*) has its own layout and stays usable for Discord admins.
const NEW_HOME = "https://zhd.erased.dev";

export default function GameMovedGate({ superOwner = false }) {
  const path = usePathname() || "";
  const onGamePage = path.startsWith("/dashboard");
  if (superOwner || !onGamePage) return null;

  return (
    <div className="moved-overlay" role="dialog" aria-modal="true" aria-label="Game management has moved">
      <div className="moved-card">
        <div className="moved-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
        <h2>Game management has moved</h2>
        <p>The game control panel now lives at a new home. Head over there to continue.</p>
        <a className="moved-btn" href={NEW_HOME} target="_blank" rel="noopener noreferrer">
          Go to zhd.erased.dev
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
        <Link className="moved-alt" href="/bot">Manage a Discord server instead →</Link>
      </div>
    </div>
  );
}
