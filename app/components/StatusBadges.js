"use client";
import { useState, useEffect } from "react";

function rel(s) {
  if (s == null) return null;
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

// Live status badges for the Overview hero. Polls /api/status every 15s (matching the
// bot's sweep cadence) so "Bot online / last sweep / active bans" reflect reality.
export default function StatusBadges() {
  const [st, setSt] = useState(null);
  useEffect(() => {
    let on = true;
    const load = async () => {
      try { const r = await fetch("/api/status"); const d = await r.json(); if (on && r.ok) setSt(d); } catch {}
    };
    load();
    const iv = setInterval(load, 15000);
    return () => { on = false; clearInterval(iv); };
  }, []);

  const online = st?.botOnline;
  const sweep = rel(st?.sweepAgo);
  const bans = st?.bansCount;
  const bansAgo = rel(st?.bansAgo);

  return (
    <div className="ov-badges">
      <span className="ov-badge">
        <span className={`ov-dot ${st == null ? "" : online ? "ov-dot-on" : "ov-dot-off"}`} />
        {st == null ? "Checking…" : online ? "Bot online" : "Bot offline"}
        {online && sweep ? <span className="ov-badge-dim"> · ping {sweep}</span> : null}
      </span>
      <span className="ov-badge">
        <span className={`ov-dot ${st == null ? "" : online ? "ov-dot-on" : "ov-dot-off"}`} />
        {online ? "Temp-grant expiry active" : "Expiry paused"}
      </span>
      <span className="ov-badge">
        <span className={`ov-dot ${bans == null ? "" : "ov-dot-on"}`} />
        {bans == null ? "Bans —" : `${bans.toLocaleString()} active bans`}
        {bansAgo ? <span className="ov-badge-dim"> · {bansAgo}</span> : null}
      </span>
    </div>
  );
}
