"use client";
import { useState } from "react";

const rgb = (c) => Array.isArray(c) ? `rgb(${c[0]},${c[1]},${c[2]})` : c;
function flatten(tags) {
  const out = [];
  for (const [g, def] of Object.entries(tags || {})) {
    if (def && (def.name || (def.colors && def.colors.length))) out.push({ group: g, rank: null, name: def.name, colors: def.colors || [] });
    for (const [r, t] of Object.entries((def && def.rankTags) || {})) out.push({ group: g, rank: Number(r), name: t.name, colors: t.colors || [] });
  }
  return out.sort((a, b) => a.group.localeCompare(b.group) || (a.rank ?? -1) - (b.rank ?? -1));
}

export default function TagForm() {
  const [f, setF] = useState({ groupId: "", name: "", color1: "#7c5cff", color2: "#22d3ee", iconId: "", animated: true, rank: "" });
  const [busy, setB] = useState(false); const [toast, setT] = useState(null);
  const [list, setList] = useState(null); const [loading, setLoading] = useState(false);
  const up = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setB(true); setT(null);
    try {
      const def = { name: f.name || undefined, colors: [f.color1, f.color2], iconId: f.iconId || undefined, animated: f.animated };
      const r = await fetch("/api/tag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: f.groupId, def, rank: f.rank || undefined }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setT({ ok: true, msg: `Tag saved for group ${f.groupId}${f.rank ? ` (rank ${f.rank})` : ""}.` });
      if (list) load();
    } catch (e) { setT({ bad: true, msg: e.message }); } setB(false);
  }
  async function load() {
    setLoading(true);
    try { const r = await fetch("/api/tag"); const d = await r.json(); if (!r.ok) throw new Error(d.error); setList(flatten(d.tags)); }
    catch (e) { setT({ bad: true, msg: e.message }); } setLoading(false);
  }
  async function del(group, rank) {
    if (typeof window !== "undefined" && !window.confirm(`Delete ${rank == null ? "the group-wide tag" : `the rank ${rank} tag`} for group ${group}?`)) return;
    try {
      const r = await fetch("/api/tag", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: group, rank: rank == null ? undefined : rank }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setT({ ok: true, msg: `Deleted tag for group ${group}.` }); load();
    } catch (e) { setT({ bad: true, msg: e.message }); }
  }

  return (
    <>
      <div className="card">
        <div className="grid g2">
          <div><label>Group ID</label><input className="mono" value={f.groupId} onChange={(e) => up("groupId", e.target.value)} placeholder="1099600954" /></div>
          <div><label>Rank (blank = whole group)</label><input className="mono" value={f.rank} onChange={(e) => up("rank", e.target.value)} placeholder="e.g. 255" /></div>
          <div><label>Tag text</label><input value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="🍋 CREW" /></div>
          <div><label>Icon asset id (optional)</label><input className="mono" value={f.iconId} onChange={(e) => up("iconId", e.target.value)} placeholder="rbxassetid…" /></div>
          <div><label>Color 1</label><input type="color" value={f.color1} onChange={(e) => up("color1", e.target.value)} /></div>
          <div><label>Color 2</label><input type="color" value={f.color2} onChange={(e) => up("color2", e.target.value)} /></div>
        </div>
        <label style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" style={{ width: "auto" }} checked={f.animated} onChange={(e) => up("animated", e.target.checked)} /> Animated gradient
        </label>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy} onClick={save}>Save tag</button>
        </div>
        {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
      </div>

      <div className="card">
        <div className="between">
          <div><div style={{ fontWeight: 700, fontSize: 15 }}>Existing crew tags</div><div className="muted" style={{ fontSize: 13 }}>Every tag in the shared database.</div></div>
          <button className="btn ghost" style={{ width: "auto" }} disabled={loading} onClick={load}>{loading ? "Loading…" : list ? "Refresh" : "Load"}</button>
        </div>
        {list && (list.length === 0 ? <p className="muted" style={{ marginTop: 14 }}>No tags yet.</p> : (
          <div className="stack" style={{ marginTop: 14 }}>
            {list.map((t) => (
              <div key={t.group + ":" + t.rank} className="between" style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 800, fontStyle: "italic", backgroundImage: `linear-gradient(180deg, ${t.colors.map(rgb).join(", ")})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{t.name || "(no text)"}</span>
                  <span className="pill mono">{t.group}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{t.rank == null ? "group-wide" : `rank ${t.rank}`}</span>
                </div>
                <button className="btn ghost" style={{ width: "auto", color: "var(--danger)" }} onClick={() => del(t.group, t.rank)}>Delete</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
