"use client";
import { useState, useEffect, useCallback } from "react";
import DiscordAvatar from "./DiscordAvatar";
import { DiscordLink } from "./ProfileLinks";

const METRICS = [
  { k: "messages", label: "Messages", unit: "" },
  { k: "voice", label: "VC hours", unit: "h" },
  { k: "reactions", label: "Reactions", unit: "" },
];

// Top-50 members for the selected guild/window. Shares guild + days with ServerAnalytics
// (passed as props); polls on its own calmer cadence since a leaderboard needn't be second-live.
export default function MemberLeaderboard({ guild, days }) {
  const [data, setData] = useState(null);
  const [metric, setMetric] = useState("messages");
  const [err, setErr] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!guild) return;
    if (!silent) { setData(null); setErr(null); }
    try {
      const r = await fetch(`/api/server-stats/members?days=${days}&guild=${guild}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setData(j);
    } catch (e) { if (!silent) setErr(e.message); }
  }, [guild, days]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const poll = () => { if (document.visibilityState === "visible") load(true); };
    const iv = setInterval(poll, 15000);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", poll); };
  }, [load]);

  const rows = (data && data[metric]) || [];
  const unit = METRICS.find((m) => m.k === metric)?.unit || "";

  return (
    <div className="card lb-card">
      <div className="between" style={{ marginBottom: 12, gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>Leaderboard <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {days}d</span></div>
        <div className="row" style={{ gap: 5 }}>
          {METRICS.map((m) => (
            <button key={m.k} className={`btn ${metric === m.k ? "" : "ghost"}`} style={{ width: "auto", padding: "5px 9px", fontSize: 12 }} onClick={() => setMetric(m.k)}>{m.label}</button>
          ))}
        </div>
      </div>
      {err ? <div className="toast bad">{err}</div>
        : data == null ? <p className="muted" style={{ padding: "8px 0" }}>Loading…</p>
        : rows.length === 0 ? <p className="muted" style={{ padding: "8px 0" }}>No member activity in this window yet.</p>
        : (
          <div className="lb-list">
            {rows.map((u, i) => (
              <div className="lb-row" key={u.id}>
                <span className={`lb-rank${i < 3 ? " lb-top" : ""}`}>{i + 1}</span>
                <DiscordAvatar actorId={u.id} name={u.name} size={30} />
                <span className="lb-name"><DiscordLink id={u.id}>{u.name}</DiscordLink></span>
                <span className="lb-val">{u.value.toLocaleString()}{unit}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
