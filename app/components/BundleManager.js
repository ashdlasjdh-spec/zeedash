"use client";
import { useState, useEffect } from "react";
import { CATALOG } from "@/lib/catalog";

const CATS = ["power", "stand", "car", "tool", "gamepass", "shazam", "startbr"];
const itemName = (cat, key) => (CATALOG[cat] || []).find((i) => i.key === key)?.name || key;

export default function BundleManager() {
  const [bundles, setBundles] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  // builder state
  const [name, setName] = useState("");
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState("power");
  const [key, setKey] = useState("");

  const [applyUser, setApplyUser] = useState({}); // bundleName -> username

  async function load() {
    try {
      const r = await fetch("/api/bundles");
      const d = await r.json();
      if (r.ok) setBundles(d.bundles || []);
      else setToast({ bad: true, msg: d.error });
    } catch (e) { setToast({ bad: true, msg: e.message }); }
  }
  useEffect(() => { load(); }, []);

  function addItem() {
    if (!key) { setToast({ bad: true, msg: "Pick an item." }); return; }
    if (items.some((i) => i.category === cat && i.key === key)) return;
    setItems((x) => [...x, { category: cat, key }]);
    setKey("");
  }

  async function post(payload) {
    setBusy(true); setToast(null);
    try {
      const r = await fetch("/api/bundles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      if (d.bundles) setBundles(d.bundles);
      return d;
    } catch (e) { setToast({ bad: true, msg: e.message }); return null; }
    finally { setBusy(false); }
  }

  async function saveBundle() {
    if (!name.trim() || !items.length) { setToast({ bad: true, msg: "Name the bundle and add at least one item." }); return; }
    const d = await post({ action: "save", name: name.trim(), items });
    if (d) { setToast({ ok: true, msg: `Saved bundle "${name.trim()}".` }); setName(""); setItems([]); }
  }
  async function delBundle(bn) {
    if (typeof window !== "undefined" && !window.confirm(`Delete bundle "${bn}"?`)) return;
    const d = await post({ action: "delete", name: bn });
    if (d) setToast({ ok: true, msg: `Deleted "${bn}".` });
  }
  async function applyBundle(bn) {
    const u = (applyUser[bn] || "").trim();
    if (!u) { setToast({ bad: true, msg: "Enter a player to apply to." }); return; }
    const d = await post({ action: "apply", name: bn, username: u });
    if (d) setToast({ ok: !d.errors?.length, msg: `Applied "${bn}" to ${d.user?.username || u}: ${d.done} granted.` + (d.skipped?.length ? ` (${d.skipped.length} skipped — no permission)` : "") + (d.errors?.length ? ` ⚠ ${d.errors.join("; ")}` : "") });
  }

  return (
    <>
      {/* ---- builder ---- */}
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 15 }}>Create / update a bundle</div>
        <div style={{ marginTop: 10 }}><label>Bundle name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VIP" /></div>
        <div className="grid g3" style={{ marginTop: 12, alignItems: "end", gap: 10 }}>
          <div>
            <label>Category</label>
            <select value={cat} onChange={(e) => { setCat(e.target.value); setKey(""); }}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div>
            <label>Item</label>
            <select value={key} onChange={(e) => setKey(e.target.value)}>
              <option value="">Select…</option>
              {(CATALOG[cat] || []).map((i) => <option key={i.key} value={i.key}>{i.name}</option>)}
            </select>
          </div>
          <button className="btn ghost" style={{ width: "auto" }} onClick={addItem}>Add item</button>
        </div>
        {items.length > 0 && (
          <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {items.map((it, i) => (
              <span key={i} className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {it.category}: {itemName(it.category, it.key)}
                <button onClick={() => setItems((x) => x.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontWeight: 800 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16 }}><button className="btn" disabled={busy} onClick={saveBundle}>Save bundle</button></div>
        {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
      </div>

      {/* ---- existing bundles ---- */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Bundles</div>
        {bundles == null && <p className="muted">Loading…</p>}
        {bundles && bundles.length === 0 && <p className="muted">No bundles yet — create one above.</p>}
        <div className="stack">
          {(bundles || []).map((b) => (
            <div key={b.name} className="item" style={{ cursor: "default" }}>
              <div className="between" style={{ alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{b.name}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{b.items.map((it) => `${it.category}:${itemName(it.category, it.key)}`).join("  ·  ")}</div>
                </div>
                <button className="btn ghost" style={{ width: "auto" }} onClick={() => delBundle(b.name)}>Delete</button>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <input style={{ flex: 1 }} value={applyUser[b.name] || ""} onChange={(e) => setApplyUser((x) => ({ ...x, [b.name]: e.target.value }))} placeholder="Roblox username or ID" />
                <button className="btn" style={{ width: "auto" }} disabled={busy} onClick={() => applyBundle(b.name)}>Apply</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
