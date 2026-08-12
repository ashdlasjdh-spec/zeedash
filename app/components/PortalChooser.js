"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Shown once right after "Continue with Discord" (the callback lands on /dashboard?welcome=1).
// Lets the signed-in user pick which area to enter. Everything is still reachable from the sidebar
// afterwards — this is just a friendly front door, not an access gate.
export default function PortalChooser({ canServer = true }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const go = (href) => { setHidden(true); router.replace(href); };

  return (
    <div className="pc-overlay" role="dialog" aria-modal="true" aria-label="Choose an area">
      <div className="pc-modal">
        <div className="pc-eyebrow"><span className="livedot" /> zhd control panel</div>
        <h2 className="pc-title">Where to?</h2>
        <p className="pc-sub">Pick an area to manage — you can switch anytime from the sidebar.</p>
        <div className="pc-cards">
          <button className="pc-card" onClick={() => go("/dashboard")}>
            <span className="pc-ico">🎮</span>
            <span className="pc-c-t">Game Management</span>
            <span className="pc-c-s">Perks, grants, moderation, group &amp; crew tags</span>
          </button>
          <button className="pc-card" onClick={() => canServer && go("/dashboard/server")} disabled={!canServer} title={canServer ? "" : "Management+ only"}>
            <span className="pc-ico">💬</span>
            <span className="pc-c-t">Server Management</span>
            <span className="pc-c-s">Discord analytics &amp; member leaderboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
