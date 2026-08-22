"use client";
import { useState } from "react";
import { CATALOG } from "@/lib/catalog";

const LABELS = { power: "Powers", stand: "Stands", car: "Cars", tool: "Tools", gamepass: "Gamepasses", shazam: "Shazam", startbr: "Start BR" };
const ORDER = ["power", "stand", "car", "tool", "gamepass", "shazam", "startbr"];
// Real, grantable items only — hide the "_EveryPower"-style grant-all shortcuts.
const items = (k) => (CATALOG[k] || []).filter((it) => it && it.key && !String(it.key).startsWith("_"));

export default function Catalog() {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const cats = ORDER.filter((k) => CATALOG[k]).map((k) => {
    const all = items(k);
    const shown = s ? all.filter((it) => String(it.name || it.key).toLowerCase().includes(s)) : all;
    return { key: k, label: LABELS[k] || k, items: shown, total: all.length };
  }).filter((c) => c.items.length);
  const totalAll = ORDER.reduce((n, k) => n + items(k).length, 0);

  const chip = { display: "inline-block", padding: "6px 12px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface-2)", fontSize: 13, fontWeight: 600, margin: "0 7px 7px 0" };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 18px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div className="brand" style={{ fontSize: 30 }}>zhd<span style={{ color: "var(--muted)" }}>.lol</span></div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.5px", margin: "12px 0 6px", color: "var(--white)" }}>Perk Catalog</h1>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>Everything you can get in the game — {totalAll} items. Check what <a href="/perks" style={{ color: "#8fb0ff" }}>you</a> have.</p>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${totalAll} items…`}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--text)", fontSize: 15, marginBottom: 18 }} />

      {cats.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>No items match &ldquo;{q}&rdquo;.</p></div>}

      {cats.map((cat) => (
        <div className="card" key={cat.key} style={{ marginBottom: 16 }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{cat.label}</div>
            <span className="muted" style={{ fontSize: 12.5 }}>{cat.items.length}{s ? ` of ${cat.total}` : ""}</span>
          </div>
          <div>{cat.items.map((it) => <span key={it.key} style={chip}>{it.name || it.key}</span>)}</div>
        </div>
      ))}

      <div style={{ textAlign: "center", marginTop: 30, fontSize: 13 }}>
        <a href="/" className="muted">← zhd.lol</a> · <a href="/docs" className="muted">docs</a> · <a href="/perks" className="muted">check my perks</a> · <a href="/preview" className="muted">tag &amp; emoji preview</a> · <a href="/status" className="muted">status</a>
      </div>
    </div>
  );
}
