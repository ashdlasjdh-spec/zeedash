"use client";
import { useState, useEffect } from "react";
import Dropdown from "./Dropdown";

const toHex = (c) =>
  Array.isArray(c) ? "#" + c.map((n) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, "0")).join("") : String(c || "#ffffff");
const normHex = (s) => {
  let v = String(s || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split("").map((x) => x + x).join("");
  return /^[0-9a-fA-F]{6}$/.test(v) ? "#" + v.toLowerCase() : String(s || "");
};

// direction -> css gradient angle + background-size + which keyframe to run
const DIRCSS = {
  down:     { angle: 180, size: "100% 200%" },
  up:       { angle: 180, size: "100% 200%" },
  right:    { angle: 90,  size: "200% 100%" },
  left:     { angle: 90,  size: "200% 100%" },
  diagonal: { angle: 135, size: "200% 200%" },
};

function TagPreview({ name, colors, animated, iconId, dir, speed }) {
  const stops = (colors && colors.length ? colors : ["#ffffff"]).map(normHex);
  const d = DIRCSS[dir] || DIRCSS.diagonal;
  const grad = `linear-gradient(${d.angle}deg, ${[...stops, ...stops].join(", ")})`;
  const dur = Math.min(8, Math.max(0.3, 1 / (Number(speed) || 0.5)));

  // Resolve the uploaded decal's image through /api/asset-thumbnail (the direct
  // asset-thumbnail URL is retired), so the icon actually shows in the preview.
  const [iconUrl, setIconUrl] = useState("");
  useEffect(() => {
    const id = String(iconId || "").match(/\d+/)?.[0];
    if (!id) { setIconUrl(""); return; }
    let alive = true;
    fetch(`/api/asset-thumbnail?id=${id}`).then((r) => r.json()).then((j) => { if (alive) setIconUrl(j.url || ""); }).catch(() => {});
    return () => { alive = false; };
  }, [iconId]);

  return (
    <div style={{ flex: "0 0 auto", width: 200 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>Live preview</div>
      <div style={{
        backgroundColor: "#14141c",
        backgroundImage: "radial-gradient(130% 120% at 50% 25%, rgba(255,255,255,.05), transparent 60%)",
        border: "1px solid var(--line)", borderRadius: 12, padding: "26px 14px",
        display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, minHeight: 140, overflow: "hidden",
      }}>
        {iconUrl && (
          <img src={iconUrl} alt="" width={26} height={26}
            style={{ objectFit: "contain", borderRadius: 4, flex: "0 0 auto" }} />
        )}
        <span style={{
          fontWeight: 800, fontStyle: "italic", fontSize: 24, lineHeight: 1.15, whiteSpace: "nowrap",
          backgroundImage: grad,
          backgroundSize: animated ? d.size : "100% 100%",
          WebkitBackgroundClip: "text", backgroundClip: "text",
          WebkitTextFillColor: "transparent", color: "transparent",
          animation: animated ? `zhdScroll_${dir || "diagonal"} ${dur}s linear infinite` : "none",
        }}>[{name || "CREW"}]</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, textAlign: "center" }}>
        {iconId ? "icon left of text · " : ""}{animated ? `${dir || "diagonal"} · speed ${Number(speed) || 0.5}` : "static"} · {stops.length} color{stops.length > 1 ? "s" : ""}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes zhdScroll_down{from{background-position:50% 0%}to{background-position:50% 200%}}
        @keyframes zhdScroll_up{from{background-position:50% 200%}to{background-position:50% 0%}}
        @keyframes zhdScroll_right{from{background-position:0% 50%}to{background-position:200% 50%}}
        @keyframes zhdScroll_left{from{background-position:200% 50%}to{background-position:0% 50%}}
        @keyframes zhdScroll_diagonal{from{background-position:0% 0%}to{background-position:200% 200%}}
      ` }} />
    </div>
  );
}

function flatten(tags) {
  const out = [];
  const m = (t) => ({ name: t.name, colors: t.colors || [], iconId: t.iconId || "", animated: t.animated !== false, dir: t.dir || "diagonal", speed: t.speed != null ? t.speed : 0.5 });
  for (const [g, def] of Object.entries(tags || {})) {
    if (def && (def.name || (def.colors && def.colors.length))) out.push({ group: g, rank: null, ...m(def) });
    for (const [r, t] of Object.entries((def && def.rankTags) || {})) out.push({ group: g, rank: Number(r), ...m(t) });
  }
  return out.sort((a, b) => a.group.localeCompare(b.group) || (a.rank ?? -1) - (b.rank ?? -1));
}

const EMPTY = { groupId: "", name: "", colors: ["#e01f1f", "#ff8a3d"], iconId: "", animated: true, dir: "diagonal", speed: 0.5, rank: "" };

export default function TagForm() {
  const [f, setF] = useState(EMPTY);
  const [busy, setB] = useState(false); const [toast, setT] = useState(null);
  const [list, setList] = useState(null); const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const up = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const setColor = (i, v) => setF((s) => ({ ...s, colors: s.colors.map((x, idx) => (idx === i ? v : x)) }));
  const addColor = () => setF((s) => (s.colors.length < 8 ? { ...s, colors: [...s.colors, "#ffffff"] } : s));
  const removeColor = (i) => setF((s) => (s.colors.length > 1 ? { ...s, colors: s.colors.filter((_, idx) => idx !== i) } : s));
  const gradient = `linear-gradient(180deg, ${f.colors.map(normHex).join(", ")})`;

  async function onUpload(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setT({ ok: true, msg: "Uploading icon & waiting for Roblox moderation…" });
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("name", f.name || "CrewTagIcon");
      const r = await fetch("/api/tag/upload", { method: "POST", body: fd });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      up("iconId", d.assetId);
      setT({ ok: true, msg: `Icon uploaded — asset id ${d.assetId}.` });
    } catch (err) { setT({ bad: true, msg: err.message }); }
    setUploading(false);
  }

  async function save() {
    setB(true); setT(null);
    try {
      const def = { name: f.name || undefined, colors: f.colors.map(normHex), iconId: f.iconId || undefined, animated: f.animated, dir: f.dir, speed: f.speed };
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
  function edit(t) {
    setF({ groupId: t.group, name: t.name || "", colors: (t.colors.length ? t.colors : ["#ffffff"]).map(toHex), iconId: t.iconId || "", animated: t.animated !== false, dir: t.dir || "diagonal", speed: t.speed != null ? t.speed : 0.5, rank: t.rank == null ? "" : String(t.rank) });
    setT({ ok: true, msg: `Loaded ${t.rank == null ? "group-wide" : `rank ${t.rank}`} tag for group ${t.group} — edit and Save to update.` });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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
        <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <div className="grid g2">
              <div><label>Group ID</label><input className="mono" value={f.groupId} onChange={(e) => up("groupId", e.target.value)} placeholder="1099600954" /></div>
              <div><label>Rank (blank = whole group)</label><input className="mono" value={f.rank} onChange={(e) => up("rank", e.target.value)} placeholder="e.g. 255" /></div>
              <div><label>Tag text</label><input value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="CREW" /></div>
              <div>
                <label>Icon (asset id, or upload a PNG)</label>
                <div className="row" style={{ gap: 8 }}>
                  <input className="mono" style={{ flex: 1 }} value={f.iconId} onChange={(e) => up("iconId", e.target.value)} placeholder="rbxassetid…" />
                  <label className="btn ghost" style={{ width: "auto", cursor: "pointer", opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? "Uploading…" : "Upload PNG"}
                    <input type="file" accept="image/png,image/jpeg" style={{ display: "none" }} disabled={uploading} onChange={onUpload} />
                  </label>
                </div>
              </div>
            </div>

            <label style={{ marginTop: 14, display: "block" }}>Colors (top → bottom gradient) — type hex codes</label>
            <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid var(--line)", backgroundImage: gradient, flex: "0 0 auto" }} />
              <div className="stack" style={{ gap: 8, flex: 1, minWidth: 240 }}>
                {f.colors.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" title="Pick a color — updates the hex" value={/^#[0-9a-fA-F]{6}$/.test(normHex(c)) ? normHex(c) : "#000000"}
                      onChange={(e) => setColor(i, e.target.value)}
                      style={{ width: 30, height: 30, padding: 0, border: "1px solid var(--line)", borderRadius: 6, background: "none", cursor: "pointer", flex: "0 0 auto" }} />
                    <input className="mono" style={{ flex: 1 }} value={c} onChange={(e) => setColor(i, e.target.value)} placeholder="#FF0090" />
                    {f.colors.length > 1 && (
                      <button className="btn ghost" style={{ width: "auto", padding: "7px 12px", color: "var(--danger)" }} onClick={() => removeColor(i)}>Remove</button>
                    )}
                  </div>
                ))}
                {f.colors.length < 8 && <button className="btn ghost" style={{ width: "auto", padding: "7px 12px" }} onClick={addColor}>+ Color</button>}
              </div>
            </div>

            <label style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" style={{ width: "auto" }} checked={f.animated} onChange={(e) => up("animated", e.target.checked)} /> Animated gradient
            </label>
            {f.animated && (
              <div className="grid g2" style={{ marginTop: 10 }}>
                <div>
                  <label>Direction</label>
                  <Dropdown value={f.dir} onChange={(e) => up("dir", e.target.value)} options={[
                    { value: "down", label: "Top → bottom (down)" }, { value: "up", label: "Bottom → top (up)" },
                    { value: "right", label: "Left → right" }, { value: "left", label: "Right → left" }, { value: "diagonal", label: "Diagonal" },
                  ]} />
                </div>
                <div>
                  <label>Speed — {Number(f.speed).toFixed(2)}× {Number(f.speed) >= 1.5 ? "(fast)" : Number(f.speed) <= 0.4 ? "(slow)" : ""}</label>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <input type="range" min="0.05" max="4" step="0.05" value={f.speed} onChange={(e) => up("speed", Number(e.target.value))} style={{ flex: 1 }} />
                    <input className="mono" type="number" min="0.05" max="4" step="0.05" value={f.speed}
                      onChange={(e) => up("speed", Math.max(0.05, Math.min(4, Number(e.target.value) || 0.5)))}
                      style={{ width: 72 }} />
                  </div>
                </div>
              </div>
            )}

            <div className="row" style={{ marginTop: 16, gap: 10 }}>
              <button className="btn" disabled={busy || uploading} onClick={save}>Save tag</button>
              <button className="btn ghost" style={{ width: "auto" }} disabled={busy} onClick={() => { setF(EMPTY); setT(null); }}>Clear / new</button>
            </div>
            {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
          </div>

          <TagPreview name={f.name} colors={f.colors} animated={f.animated} iconId={f.iconId} dir={f.dir} speed={f.speed} />
        </div>
      </div>

      <div className="card">
        <div className="between">
          <div><div style={{ fontWeight: 700, fontSize: 15 }}>Existing crew tags</div><div className="muted" style={{ fontSize: 13 }}>Every tag in the shared database. Edit reloads it into the form above.</div></div>
          <button className="btn ghost" style={{ width: "auto" }} disabled={loading} onClick={load}>{loading ? "Loading…" : list ? "Refresh" : "Load"}</button>
        </div>
        {list && (list.length === 0 ? <p className="muted" style={{ marginTop: 14 }}>No tags yet.</p> : (() => {
          const s = q.trim().toLowerCase();
          const shown = s ? list.filter((t) => (t.name || "").toLowerCase().includes(s) || String(t.group).toLowerCase().includes(s) || (t.rank != null && String(t.rank) === s)) : list;
          return (
          <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${list.length} tags — name, group ID, or rank…`} style={{ marginTop: 14 }} />
          {shown.length === 0 ? <p className="muted" style={{ marginTop: 12 }}>No tags match “{q}”.</p> : (
          <div className="stack" style={{ marginTop: 12 }}>
            {shown.map((t) => (
              <div key={t.group + ":" + t.rank} className="between" style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontStyle: "italic", backgroundImage: `linear-gradient(180deg, ${t.colors.map(toHex).join(", ")})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{t.name || "(no text)"}</span>
                  <span className="pill mono">{t.group}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{t.rank == null ? "group-wide" : `rank ${t.rank}`}</span>
                  {t.animated && <span className="muted" style={{ fontSize: 11 }}>{t.dir}</span>}
                  {t.iconId && <span className="muted mono" style={{ fontSize: 11 }}>icon {t.iconId}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn ghost" style={{ width: "auto" }} onClick={() => edit(t)}>Edit</button>
                  <button className="btn ghost" style={{ width: "auto", color: "var(--danger)" }} onClick={() => del(t.group, t.rank)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          )}
          </>
          );
        })())}
      </div>
    </>
  );
}
