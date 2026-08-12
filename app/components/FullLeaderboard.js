"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import DiscordAvatar from "./DiscordAvatar";
import { DiscordLink } from "./ProfileLinks";
import { useGuilds } from "./metaFields";

const RANGES = [7, 14, 30, 90];
const METRICS = [
  { k: "messages", label: "Messages", unit: "" },
  { k: "voice", label: "VC hours", unit: "h" },
  { k: "reactions", label: "Reactions", unit: "" },
];

// Full-page member leaderboard (Server Management portal). The server is chosen from the sidebar
// picker (?guild= URL param); this shows top 50 by the chosen metric + window, with a rank bar.
export default function FullLeaderboard() {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const guilds = useGuilds();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("messages");
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  const guild = guildParam || guilds[0]?.id || "";

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
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (guilds.length === 0) {
    return <div className="card"><p className="muted">No server activity recorded yet. Once the bot is collecting, the leaderboard builds up here over time.</p></div>;
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 16, gap: 6, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
        {METRICS.map((m) => (
          <button key={m.k} className={`btn ${metric === m.k ? "" : "ghost"}`} style={{ width: "auto", padding: "7px 12px", fontSize: 12.5 }} onClick={() => setMetric(m.k)}>{m.label}</button>
        ))}
        <span style={{ width: 8 }} />
        {RANGES.map((d) => (
          <button key={d} className={`btn ${days === d ? "" : "ghost"}`} style={{ width: "auto", padding: "7px 11px" }} onClick={() => setDays(d)}>{d}d</button>
        ))}
      </div>

      {err ? <div className="toast bad">{err}</div>
        : data == null ? <p className="muted" style={{ padding: "8px 0" }}>Loading…</p>
        : rows.length === 0 ? <p className="muted" style={{ padding: "8px 0" }}>No member activity in this window yet.</p>
        : (
          <div className="lb-list">
            {rows.map((u, i) => (
              <div className="lb-row lb-row-full" key={u.id}>
                <span className={`lb-rank${i < 3 ? " lb-top" : ""}`}>{i + 1}</span>
                <DiscordAvatar actorId={u.id} name={u.name} size={34} />
                <span className="lb-name"><DiscordLink id={u.id}>{u.name}</DiscordLink></span>
                <span className="lb-bar-track"><span className="lb-bar" style={{ width: `${Math.max(3, Math.round((u.value / max) * 100))}%` }} /></span>
                <span className="lb-val">{u.value.toLocaleString()}{unit}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
