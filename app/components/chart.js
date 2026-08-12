"use client";
import { useState, useRef, useMemo } from "react";

// Shared chart primitives — used by both the Server analytics and Moderation analytics pages so
// their graphs are literally the same component.

export const fmt = (n) => {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return String(n);
};

// A "nice" y-axis: pick a round step (1/2/5 × 10ⁿ) and a top that's a whole multiple of it, so the
// gridline labels are always distinct, evenly spaced, and sit exactly on their value.
export function niceScale(rawMax, targetLines = 4) {
  const max = Math.max(1, rawMax || 0);
  const rawStep = max / targetLines;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const f = rawStep / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step * 1e-6; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { top, ticks: ticks.reverse() }; // top → 0
}

// value points -> {x,y} in a viewBox. Values clamped >= 0 so the plot never leaves the box.
// forcedMax scales the plot to the axis top so the line lines up with the gridlines.
export function points(vals, w, h, pad, forcedMax) {
  const n = vals.length;
  const max = forcedMax != null ? Math.max(1, forcedMax) : Math.max(1, ...vals.map((v) => Math.max(0, v)));
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  return { max, pts: vals.map((v, i) => ({ x: pad.l + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw), y: pad.t + ph - (Math.max(0, v) / max) * ph })) };
}

// Monotone cubic (Fritsch–Carlson) path — smooth, but NEVER overshoots the data, so flat/sparse
// series stay clean with no dips below the baseline or bulges above a spike.
export function smooth(p) {
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

const AC_W = 1000, AC_H = 240, AC_PAD = { l: 48, r: 16, t: 18, b: 26 };

export function AreaChart({ series, label = "messages", accessor = (s) => s.messages, color = "#ffffff" }) {
  const [hi, setHi] = useState(null);
  const wrapRef = useRef(null);
  const uid = color.replace(/[^a-z0-9]/gi, "");
  const fillId = "af" + uid, glowId = "ag" + uid;
  const W = AC_W, H = AC_H, pad = AC_PAD;
  const base = H - pad.b;
  // Geometry depends only on the data (series/accessor), NOT on the hovered index. Memoize it so
  // the Fritsch–Carlson smoothing + point/scale math isn't recomputed on every mousemove (which
  // only moves the hover marker). Same values as before — purely a caching change.
  const { vals, yTicks, pts, line, area, n, xIdx } = useMemo(() => {
    const vals = series.map(accessor);
    const rawMax = Math.max(0, ...vals.map((v) => Math.max(0, v)));
    const { top, ticks: yTicks } = niceScale(rawMax, 4);
    const { pts } = points(vals, W, H, pad, top);
    const line = smooth(pts);
    const area = pts.length ? `${line} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z` : "";
    const n = series.length;
    const want = n <= 14 ? n : n <= 30 ? 8 : 7;
    const step = Math.max(1, Math.round((n - 1) / (want - 1)));
    const xIdx = [];
    for (let i = 0; i < n; i += step) xIdx.push(i);
    if (xIdx[xIdx.length - 1] !== n - 1) xIdx.push(n - 1);
    return { vals, yTicks, pts, line, area, n, xIdx };
  }, [series, accessor]);

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

export function Spark({ vals, color = "#5b8cff" }) {
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
