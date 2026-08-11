"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Dropdown from "./Dropdown";

const RANGES = [7, 14, 30, 90];
const METRICS = [
  { k: "messages", label: "Messages", acc: (s) => s.messages, color: "#5b8cff" },
  { k: "reactions", label: "Reactions", acc: (s) => s.reactions, color: "#a78bfa" },
  { k: "voice", label: "Voice hours", acc: (s) => Math.round((s.voiceMinutes / 60) * 10) / 10, color: "#34d399" },
];
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

// value points -> {x,y} in a viewBox. Values clamped >= 0 so the plot never leaves the box.
function points(vals, w, h, pad) {
  const n = vals.length;
  const max = Math.max(1, ...vals.map((v) => Math.max(0, v)));
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  return { max, pts: vals.map((v, i) => ({ x: pad.l + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw), y: pad.t + ph - (Math.max(0, v) / max) * ph })) };
}
// Monotone cubic (Fritsch–Carlson) path — smooth, but NEVER overshoots the data, so flat/sparse
// series stay clean with no dips below the baseline or bulges above a spike. This is the fix for
// the glitchy Catmull-Rom curves.
function smooth(p) {
  const n = p.length;
  if (n === 0) return "";
  if (n === 1) return `M${p[0].x},${p[0].y}`;
  const dx = [], slope = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1].x - p[i].x || 1e-6; slope[i] = (p[i + 1].y - p[i].y) / dx[i]; }
  const m = new Array(n);
  m[0] = slope[0]; m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / slope[i], b = m[i + 1] / slope[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * slope[i]; m[i + 1] = t * b * slope[i]; }
  }
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    d += ` C${p[i].x + dx[i] / 3},${p[i].y + (m[i] * dx[i]) / 3} ${p[i + 1].x - dx[i] / 3},${p[i + 1].y - (m[i + 1] * dx[i]) / 3} ${p[i + 1].x},${p[i + 1].y}`;
  }
  return d;
}

function AreaChart({ series, label = "messages", accessor = (s) => s.messages, color = "#ffffff" }) {
  const [hi, setHi] = useState(null);
  const wrapRef = useRef(null);
  const uid = color.replace(/[^a-z0-9]/gi, "");
  const fillId = "af" + uid, glowId = "ag" + uid;
  const W = 1000, H = 240, pad = { l: 48, r: 16, t: 18, b: 26 };
  const vals = series.map(accessor);
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

  function onMove(e) {
    const el = wrapRef.current; if (!el || n < 1) return;
    const r = el.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHi(Math.round(fx * (n - 1)));
  }
  const hp = hi != null && pts[hi] ? pts[hi] : null;

  return (
    <div ref={wrapRef} className="an-chart2" onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="70%" stopColor={color} stopOpacity="0.05" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={color} floodOpacity="0.45" />
          </filter>
        </defs>
        {yTicks.map((v, i) => {
          const y = pad.t + (i / (yTicks.length - 1)) * (H - pad.t - pad.b);
          return (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="1" strokeDasharray={i === yTicks.length - 1 ? "0" : "3 5"} />
              <text x={pad.l - 10} y={y + 4} textAnchor="end" fontSize="12" fill="var(--faint)">{fmt(v)}</text>
            </g>
          );
        })}
        {area && <path d={area} fill={`url(#${fillId})`} />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" filter={`url(#${glowId})`} />}
        {pts.length > 0 && <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill={color} />}
        {xIdx.map((i) => (
          <text key={i} x={pts[i].x} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--faint)">{series[i].label.split(" ")[1]}</text>
        ))}
        {hp && <>
          <line x1={hp.x} x2={hp.x} y1={pad.t} y2={base} stroke="rgba(255,255,255,.25)" strokeWidth="1" />
          <circle cx={hp.x} cy={hp.y} r="4.5" fill={color} stroke="var(--bg)" strokeWidth="2" />
        </>}
      </svg>
      {hp && (
        <div className="an-tip" style={{ left: `${(hi / Math.max(1, n - 1)) * 100}%`, top: `${(hp.y / H) * 100}%` }}>
          <div className="an-tip-v">{Number(vals[hi] || 0).toLocaleString()} <span>{label}</span></div>
          <div className="an-tip-d">{series[hi].label}</div>
        </div>
      )}
    </div>
  );
}

function Spark({ vals, color = "#5b8cff" }) {
  const W = 220, H = 44, pad = { l: 1, r: 1, t: 9, b: 2 };
  const { pts } = points(vals, W, H, pad);
  const line = smooth(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z` : "";
  const id = "sp-" + color.replace(/[^a-z0-9]/gi, "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="44" preserveAspectRatio="none" style={{ display: "block", marginTop: 12 }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.35" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {area && <path d={area} fill={`url(#${id})`} />}
      {line && <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
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
