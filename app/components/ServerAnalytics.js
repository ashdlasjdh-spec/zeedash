"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fmt, AreaChart } from "./chart";
import { Spark } from "./chart";

const RANGES = [7, 14, 30, 90];
const METRICS = [
  { k: "messages", label: "Messages", acc: (s) => s.messages, color: "#5b8cff" },
  { k: "reactions", label: "Reactions", acc: (s) => s.reactions, color: "#a78bfa" },
  { k: "voice", label: "Voice hours", acc: (s) => Math.round((s.voiceMinutes / 60) * 10) / 10, color: "#34d399" },
];

const ICO = {
  msg: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-4a8.4 8.4 0 1 1 16.9-5.5z" />,
  react: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></>,
  voice: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
};
function StatIco({ name }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICO[name]}</svg>;
}
function Delta({ cur, prev }) {
  if (!prev || prev <= 0) return null;
  const p = Math.round(((cur - prev) / prev) * 100);
  if (!Number.isFinite(p) || p === 0) return null;
  return <span className={`sa-delta ${p > 0 ? "up" : "down"}`}>{p > 0 ? "+" : ""}{p}%</span>;
}

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

function ServerIcon({ guild, name, size = 40 }) {
  const url = guild?.icon ? `https://cdn.discordapp.com/icons/${guild.guildId}/${guild.icon}.png?size=64` : null;
  const box = { width: size, height: size, borderRadius: 11, flex: "0 0 auto" };
  if (url) return <img src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" style={{ ...box, objectFit: "cover" }} />;
  return <span className="svp-fallback" style={{ ...box, fontSize: 16 }}>{(name || "?").trim()[0]?.toUpperCase() || "?"}</span>;
}

export default function ServerAnalytics({ userName }) {
  const sp = useSearchParams();
  const guild = sp.get("guild") || "";
  const [data, setData] = useState(null);
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
    } catch (e) { if (!silent) setErr(e.message); }
    if (!silent) setLoading(false);
  }, []);
  useEffect(() => { load(guild, days); }, [load, guild, days]);
  useEffect(() => {
    const poll = () => { if (document.visibilityState === "visible") load(guild, days, true); };
    const iv = setInterval(poll, 4000);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", poll); };
  }, [load, guild, days]);

  if (err) return <div className="card"><div className="toast bad">{err}</div></div>;
  if (!data) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-row" style={{ height: 88 }} />)}
      </div>
      <div className="skeleton-chart" />
    </div>
  );

  const guilds = data.guilds || [];
  if (guilds.length === 0) {
    return <div className="card"><p className="muted">No server activity recorded yet. Once the bot is collecting (message/reaction/voice events), analytics appear here within a few minutes and build up over time.</p></div>;
  }

  const cur = guilds.find((g) => g.guildId === data.guild) || guilds[0];
  const serverName = cur?.guildName || "your server";
  const t = data.totals || {};
  const p = data.prev || {};
  const series = fillSeries(data.series || [], days);
  const channels = data.channels || [];
  const m = METRICS.find((x) => x.k === metric) || METRICS[0];

  const cards = [
    { l: "Messages", n: t.messages || 0, prev: p.messages, spark: series.map((s) => s.messages), color: "#5b8cff", ico: "msg" },
    { l: "Reactions", n: t.reactions || 0, prev: p.reactions, spark: series.map((s) => s.reactions), color: "#a78bfa", ico: "react" },
    { l: "Voice hours", n: Math.round((t.voiceMinutes || 0) / 60), prev: Math.round((p.voiceMinutes || 0) / 60), spark: series.map((s) => s.voiceMinutes / 60), color: "#34d399", ico: "voice" },
  ];

  return (
    <div style={{ opacity: loading ? 0.7 : 1 }}>
      {/* Greeting */}
      <div className="sa-hello">
        <ServerIcon guild={cur} name={serverName} />
        <div>
          <h1 className="sa-hello-h">Hello {userName || "there"},</h1>
          <p className="sa-hello-sub">Here&apos;s a quick overview of the engagement in <b>{serverName}</b>{t.members != null ? ` · ${fmt(t.members)} members` : ""}.</p>
        </div>
      </div>

      {/* Section head + ranges */}
      <div className="sa-eyebrow-row">
        <div className="sa-eyebrow"><span className="livedot" /> Server analytics</div>
        <div className="row" style={{ gap: 6 }}>
          {RANGES.map((d) => (
            <button key={d} className={`btn ${days === d ? "" : "ghost"}`} style={{ width: "auto", padding: "6px 12px", fontSize: 12.5 }} onClick={() => setDays(d)}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Stat cards with deltas */}
      <div className="sa-stats">
        {cards.map((c, i) => (
          <div className="sa-stat" key={i}>
            <div className="sa-stat-top"><span className="sa-stat-l">{c.l}</span><span className="sa-stat-ico"><StatIco name={c.ico} /></span></div>
            <div className="sa-stat-n">{fmt(c.n)}<Delta cur={c.n} prev={c.prev} /></div>
            <Spark vals={c.spark} color={c.color} />
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <div className="card">
        <div className="between" style={{ marginBottom: 14, gap: 10, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{m.label} activity</div>
            <div className="muted" style={{ fontSize: 12.5 }}>Daily {m.label.toLowerCase()} over the last {days} days</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {METRICS.map((x) => (
              <button key={x.k} className={`btn ${metric === x.k ? "" : "ghost"}`} style={{ width: "auto", padding: "6px 11px", fontSize: 12.5 }} onClick={() => setMetric(x.k)}>{x.label}</button>
            ))}
          </div>
        </div>
        <AreaChart series={series} label={m.label.toLowerCase()} accessor={m.acc} color={m.color} />
      </div>

      {/* Top channels */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Top channels</div>
        {channels.length === 0 ? <p className="muted">No channel data yet.</p> : (
          <>
            <div className="sa-chan-head"><span>#</span><span>Channel</span><span style={{ textAlign: "right" }}>Messages</span></div>
            {channels.map((c, i) => (
              <div className="sa-chan-row" key={c.id}>
                <span className="sa-chan-rank">{i + 1}</span>
                <span className="sa-chan-pill">#{c.name}</span>
                <span className="sa-chan-val">{c.messages.toLocaleString()}</span>
              </div>
            ))}
            <div className="sa-chan-foot">{channels.length} channel{channels.length === 1 ? "" : "s"}</div>
          </>
        )}
      </div>
    </div>
  );
}
