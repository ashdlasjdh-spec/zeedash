"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Shown once right after "Continue with Discord" (the callback lands on /dashboard?welcome=1).
// A polished, branded front door for picking which area to manage. Everything stays reachable from the
// sidebar afterwards — this is not an access gate.
export default function PortalChooser({ canServer = true }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const go = (href) => { setHidden(true); router.replace(href); };

  return (
    <div className="pc-overlay" role="dialog" aria-modal="true" aria-label="Choose an area">
      <div className="pc-modal">
        <button className="pc-close" aria-label="Dismiss" onClick={() => setHidden(true)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="pc-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zhd-mark.png" alt="ZHD" width="46" height="46" />
          <div className="pc-eyebrow"><span className="livedot" /> ZHD Control Panel</div>
        </div>

        <h2 className="pc-title">Where to?</h2>
        <p className="pc-sub">Choose an area to manage. You can switch anytime from the sidebar.</p>

        <div className="pc-cards">
          <button className="pc-card" onClick={() => go("/dashboard")}>
            <span className="pc-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="4" /><path d="M7 12h4M9 10v4" /><circle cx="16" cy="11" r="1" /><circle cx="18.5" cy="13.5" r="1" />
              </svg>
            </span>
            <span className="pc-c-txt">
              <span className="pc-c-t">Game Management</span>
              <span className="pc-c-s">Perks, grants, moderation, group &amp; crew tags</span>
            </span>
            <span className="pc-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </button>

          <button className="pc-card" onClick={() => canServer && go("/bot")} disabled={!canServer} title={canServer ? "" : "Management+ only"}>
            <span className="pc-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z" /><path d="M8 9h8M8 13h5" />
              </svg>
            </span>
            <span className="pc-c-txt">
              <span className="pc-c-t">Server Management</span>
              <span className="pc-c-s">Discord analytics &amp; member leaderboard</span>
            </span>
            <span className="pc-arrow" aria-hidden="true">
              {canServer
                ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                : <span className="pc-lock">Management+</span>}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
