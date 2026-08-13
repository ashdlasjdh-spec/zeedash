"use client";
import { useState } from "react";

const pretty = (k) => String(k).replace(/[_-]/g, " ").replace(/s$/, "").replace(/\b\w/g, (c) => c.toUpperCase());
const prettyItem = (v) => String(v).replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
function splitEmojis(str) {
  const s = String(str || "").trim();
  if (!s) return [];
  try { if (Intl.Segmenter) return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map((x) => x.segment).filter((x) => x.trim()); } catch {}
  return Array.from(s).filter((x) => x.trim());
}

export default function MyPerks() {
  const [u, setU] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const search = async (e) => {
    e?.preventDefault?.();
    if (!u.trim() || loading) return;
    setLoading(true); setErr(null); setData(null);
    try {
      const r = await fetch(`/api/my-perks?u=${encodeURIComponent(u.trim())}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Lookup failed");
      setData(j);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const chip = { display: "inline-block", padding: "4px 10px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface-2)", fontSize: 12.5, fontWeight: 600, margin: "0 6px 6px 0" };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 18px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div className="brand" style={{ fontSize: 30 }}>zhd<span style={{ color: "var(--muted)" }}>.lol</span></div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.5px", margin: "12px 0 6px", color: "var(--white)" }}>Check my perks</h1>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>Type your Roblox username to see what you have — powers, stands, tools, gamepasses and emojis.</p>
      </div>

      <form onSubmit={search} className="row" style={{ gap: 10 }}>
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="Your Roblox username" style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--text)", fontSize: 15 }} />
        <button className="btn" style={{ width: "auto" }} disabled={loading}>{loading ? "Checking…" : "Check"}</button>
      </form>

      {err && <div className="toast bad" style={{ marginTop: 14 }}>{err}</div>}

      {data && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="between" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{data.username}</div>
            <a className="muted" href={`https://www.roblox.com/users/${data.userId}/profile`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>Roblox profile ↗</a>
          </div>

          {!data.has && <div className="muted" style={{ fontSize: 14 }}>No perks or emojis found for this user yet.</div>}

          {data.emoji && (
            <div style={{ marginBottom: 16 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700, marginBottom: 8 }}>Emojis</div>
              <div style={{ fontSize: 22 }}>{splitEmojis(data.emoji).map((e, i) => <span key={i} style={{ marginRight: 6 }}>[{e}]</span>)}</div>
            </div>
          )}

          {Object.entries(data.perks || {}).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700, marginBottom: 8 }}>{pretty(cat)}</div>
              <div>{items.map((it, i) => <span key={i} style={chip}>{prettyItem(it)}</span>)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 30, fontSize: 13 }}>
        <a href="/" className="muted">← zhd.lol</a> · <a href="/preview" className="muted">tag &amp; emoji preview</a> · <a href="/status" className="muted">status</a>
      </div>
    </div>
  );
}
