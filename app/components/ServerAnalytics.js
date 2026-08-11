"use client";
import { useState, useEffect, useCallback } from "react";

const RANGES = [7, 14, 30, 90];
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : String(n));

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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async (g, d) => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/server-stats?days=${d}${g ? `&guild=${g}` : ""}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setData(j);
      if (!g && j.guild) setGuild(j.guild);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(guild, days); }, [load, guild, days]);

  if (err) return <div className="card"><div className="toast bad">{err}</div></div>;
  if (!data) return <div className="card"><p className="muted">Loading…</p></div>;

  const guilds = data.guilds || [];
  if (guilds.length === 0) {
    return (
      <div className="card">
        <p className="muted">No server activity recorded yet. Once the bot is collecting (message/reaction/voice events), analytics will appear here within a few minutes and build up over time.</p>
      </div>
    );
  }

  const t = data.totals || {};
  const series = fillSeries(data.series || [], days);
  const dayMax = Math.max(1, ...series.map((s) => s.messages));
  const channels = data.channels || [];
  const chMax = Math.max(1, ...channels.map((c) => c.messages));

  const stats = [
    { n: t.messages || 0, l: "Messages" },
    { n: t.reactions || 0, l: "Reactions" },
    { n: Math.round((t.voiceMinutes || 0) / 60), l: "Voice hours" },
    { n: t.members ?? "—", l: "Members", raw: t.members == null },
  ];

  return (
    <>
      <div className="between" style={{ marginBottom: 16, gap: 10 }}>
        <select value={guild} onChange={(e) => setGuild(e.target.value)} style={{ width: "auto", minWidth: 220 }}>
          {guilds.map((g) => <option key={g.guildId} value={g.guildId}>{g.guildName}</option>)}
        </select>
        <div className="row" style={{ gap: 6 }}>
          {RANGES.map((d) => (
            <button key={d} className={`btn ${days === d ? "" : "ghost"}`} style={{ width: "auto", padding: "7px 13px" }} onClick={() => setDays(d)}>{d}d</button>
          ))}
        </div>
      </div>

      <div className="ov-stats" style={{ opacity: loading ? 0.6 : 1 }}>
        {stats.map((s, i) => (
          <div className="ov-stat" key={i}>
            <div className="ov-n">{s.raw ? s.n : fmt(Number(s.n) || 0)}</div>
            <div className="ov-l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>Message activity</div>
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>Daily messages over the last {days} days.</div>
        <div className="an-chart-wrap">
          <div className="an-chart" style={{ minWidth: days > 40 ? 700 : undefined }}>
            {series.map((s) => (
              <div className="an-col" key={s.key} title={`${s.label}: ${s.messages.toLocaleString()} messages`}>
                <div className="an-col-bar" style={{ height: `${Math.round((s.messages / dayMax) * 100)}%` }} />
                <div className="an-col-l">{days <= 30 ? s.label.split(" ")[1] : ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Top channels <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {days}d</span></div>
        {channels.length === 0 ? <p className="muted">No channel data yet.</p> : (
          <div className="an-hbars">
            {channels.map((c, i) => (
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
