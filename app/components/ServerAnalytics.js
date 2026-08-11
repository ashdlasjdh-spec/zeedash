"use client";
import { useState, useEffect, useCallback } from "react";
import Dropdown from "./Dropdown";
import { fmt, AreaChart, Spark } from "./chart";

const RANGES = [7, 14, 30, 90];
const METRICS = [
  { k: "messages", label: "Messages", acc: (s) => s.messages, color: "#5b8cff" },
  { k: "reactions", label: "Reactions", acc: (s) => s.reactions, color: "#a78bfa" },
  { k: "voice", label: "Voice hours", acc: (s) => Math.round((s.voiceMinutes / 60) * 10) / 10, color: "#34d399" },
];

function fillSeries(series, days) {
  const map = new Map(series.map((r) => [r.d, r]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const key = dt.toISOString().slice(0, 10);
    const r = map.get(key) || { messages: 0, reactions: 0, voiceMinutes: 0 };
    out.push({ key, label: dt.toLocaleDateString([], { month: "short", day: "numeric" }), ...r });
  }
  return out;
}

export default function ServerAnalytics() {
  const [data, setData] = useState(null);
  const [guild, setGuild] = useState("");
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("messages");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async (g, d, silent = false) => {
    if (!silent) setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/server-stats?days=${d}${g ? `&guild=${g}` : ""}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setData(j);
      if (!g && j.guild) setGuild(j.guild);
    } catch (e) { if (!silent) setErr(e.message); }
    if (!silent) setLoading(false);
  }, []);
  useEffect(() => { load(guild, days); }, [load, guild, days]);
  // Live: the bot pushes fresh stats ~every 60s, so silently re-fetch every 30s (and the moment
  // the tab becomes visible again). No loading flash — numbers/chart just update in place.
  useEffect(() => {
    const poll = () => { if (document.visibilityState === "visible") load(guild, days, true); };
    const iv = setInterval(poll, 4000);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", poll); };
  }, [load, guild, days]);

  if (err) return <div className="card"><div className="toast bad">{err}</div></div>;
  if (!data) return <div className="card"><p className="muted">Loading…</p></div>;

  const guilds = data.guilds || [];
  if (guilds.length === 0) {
    return <div className="card"><p className="muted">No server activity recorded yet. Once the bot is collecting (message/reaction/voice events), analytics appear here within a few minutes and build up over time.</p></div>;
  }

  const t = data.totals || {};
  const series = fillSeries(data.series || [], days);
  const channels = data.channels || [];
  const chMax = Math.max(1, ...channels.map((c) => c.messages));

  const cards = [
    { n: t.messages || 0, l: "Messages", spark: series.map((s) => s.messages), color: "#5b8cff" },
    { n: t.reactions || 0, l: "Reactions", spark: series.map((s) => s.reactions), color: "#a78bfa" },
    { n: Math.round((t.voiceMinutes || 0) / 60), l: "Voice hours", spark: series.map((s) => s.voiceMinutes / 60), color: "#34d399" },
    { n: t.members, l: "Members", members: true },
  ];

  return (
    <>
      <div className="between" style={{ marginBottom: 16, gap: 10 }}>
        <Dropdown value={guild} onChange={(e) => setGuild(e.target.value)} style={{ width: "auto" }} minWidth={220} options={guilds.map((g) => ({ value: g.guildId, label: g.guildName }))} />
        <div className="row" style={{ gap: 6, alignItems: "center" }}>
          <span className="pill" title="Auto-updates every 30s"><span className="livedot" /> Live</span>
          {RANGES.map((d) => (
            <button key={d} className={`btn ${days === d ? "" : "ghost"}`} style={{ width: "auto", padding: "7px 13px" }} onClick={() => setDays(d)}>{d}d</button>
          ))}
        </div>
      </div>

      <div className="ov-stats" style={{ opacity: loading ? 0.6 : 1 }}>
        {cards.map((c, i) => (
          <div className="ov-stat" key={i}>
            <div className="ov-n">{c.members ? (c.n == null ? "—" : fmt(c.n)) : fmt(c.n)}</div>
            <div className="ov-l">{c.l}</div>
            {c.spark && <Spark vals={c.spark} color={c.color} />}
          </div>
        ))}
      </div>

      {(() => {
        const m = METRICS.find((x) => x.k === metric) || METRICS[0];
        return (
          <div className="card">
            <div className="between" style={{ marginBottom: 12, gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{m.label} activity</div>
                <div className="muted" style={{ fontSize: 12.5 }}>Daily {m.label.toLowerCase()} over the last {days} days.</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                {METRICS.map((x) => (
                  <button key={x.k} className={`btn ${metric === x.k ? "" : "ghost"}`} style={{ width: "auto", padding: "6px 11px", fontSize: 12.5 }} onClick={() => setMetric(x.k)}>{x.label}</button>
                ))}
              </div>
            </div>
            <AreaChart series={series} label={m.label.toLowerCase()} accessor={m.acc} color={m.color} />
          </div>
        );
      })()}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Top channels <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {days}d</span></div>
        {channels.length === 0 ? <p className="muted">No channel data yet.</p> : (
          <div className="an-hbars">
            {channels.map((c) => (
              <div className="an-hrow" key={c.id}>
                <span className="an-hlabel" style={{ width: 160 }}>#{c.name}</span>
                <span className="an-htrack"><span className="an-hbar" style={{ width: `${Math.max(4, Math.round((c.messages / chMax) * 100))}%` }} /></span>
                <span className="an-hval" style={{ width: 56 }}>{c.messages.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
