"use client";
import { useState, useEffect, useCallback } from "react";

const RANGES = [7, 14, 30, 90];
const fmt = (n) => {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return String(n);
};

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

// value points -> {x,y} in a viewBox, and a smooth (Catmull-Rom -> bezier) path.
function points(vals, w, h, pad) {
  const n = vals.length;
  const max = Math.max(1, ...vals);
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  return { max, pts: vals.map((v, i) => ({ x: pad.l + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw), y: pad.t + ph - (v / max) * ph })) };
}
function smooth(p) {
  if (!p.length) return "";
  if (p.length === 1) return `M${p[0].x},${p[0].y}`;
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
  }
  return d;
}

function AreaChart({ series }) {
  const W = 1000, H = 240, pad = { l: 46, r: 14, t: 16, b: 26 };
  const vals = series.map((s) => s.messages);
  const { max, pts } = points(vals, W, H, pad);
  const line = smooth(pts);
  const base = H - pad.b;
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z` : "";
  const yTicks = [max, Math.round(max / 2), 0];
  const n = series.length;
  const want = n <= 14 ? n : n <= 30 ? 8 : 7;
  const step = Math.max(1, Math.round((n - 1) / (want - 1)));
  const xIdx = [];
  for (let i = 0; i < n; i += step) xIdx.push(i);
  if (xIdx[xIdx.length - 1] !== n - 1) xIdx.push(n - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="msgfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => {
        const y = pad.t + (i / (yTicks.length - 1)) * (H - pad.t - pad.b);
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="1" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="12" fill="var(--faint)">{fmt(v)}</text>
          </g>
        );
      })}
      {area && <path d={area} fill="url(#msgfill)" />}
      {line && <path d={line} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      {xIdx.map((i) => (
        <text key={i} x={pts[i].x} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--faint)">{series[i].label.split(" ")[1]}</text>
      ))}
    </svg>
  );
}

function Spark({ vals }) {
  const W = 130, H = 34, pad = { l: 2, r: 2, t: 7, b: 3 };
  const { pts } = points(vals, W, H, pad);
  const line = smooth(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z` : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="34" preserveAspectRatio="none" style={{ display: "block", marginTop: 10 }}>
      {area && <path d={area} fill="rgba(255,255,255,.1)" />}
      {line && <path d={line} fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
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
    return <div className="card"><p className="muted">No server activity recorded yet. Once the bot is collecting (message/reaction/voice events), analytics appear here within a few minutes and build up over time.</p></div>;
  }

  const t = data.totals || {};
  const series = fillSeries(data.series || [], days);
  const channels = data.channels || [];
  const chMax = Math.max(1, ...channels.map((c) => c.messages));

  const cards = [
    { n: t.messages || 0, l: "Messages", spark: series.map((s) => s.messages) },
    { n: t.reactions || 0, l: "Reactions", spark: series.map((s) => s.reactions) },
    { n: Math.round((t.voiceMinutes || 0) / 60), l: "Voice hours", spark: series.map((s) => s.voiceMinutes / 60) },
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
        {cards.map((c, i) => (
          <div className="ov-stat" key={i}>
            <div className="ov-n">{c.raw ? c.n : fmt(c.n)}</div>
            <div className="ov-l">{c.l}</div>
            {c.spark && c.spark.some((v) => v > 0) && <Spark vals={c.spark} />}
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>Message activity</div>
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>Daily messages over the last {days} days.</div>
        <AreaChart series={series} />
      </div>

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
