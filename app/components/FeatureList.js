"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGuildMeta, fieldsNeedMeta, isMetaType, MetaSelect, MetaMultiSelect, OptionMultiSelect } from "./metaFields";

// Feature config for list-style features (autoresponder, autoreact, reaction roles). Enable toggle +
// an editable list of rows, persisted to /api/guild-settings as config.items. OFF by default.
export default function FeatureList({ feature, title, description, columns, addLabel = "Add entry" }) {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const [guilds, setGuilds] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetch("/api/server-stats/guilds").then((r) => r.json()).then((j) => setGuilds(j.guilds || [])).catch(() => {}); }, []);
  const guild = guildParam || guilds[0]?.id || "";
  const meta = useGuildMeta(guild, fieldsNeedMeta([{ cols: columns }]));

  useEffect(() => {
    if (!guild) return;
    setLoading(true);
    fetch(`/api/guild-settings?guild=${guild}`)
      .then((r) => r.json())
      .then((j) => { const s = j.settings?.[feature] || {}; setEnabled(!!s.enabled); setItems(Array.isArray(s.config?.items) ? s.config.items : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guild, feature]);

  const blank = () => Object.fromEntries(columns.map((c) => [c.key, c.type === "bool" ? false : ""]));
  const add = () => setItems((x) => [...x, blank()]);
  const remove = (i) => setItems((x) => x.filter((_, idx) => idx !== i));
  const setCell = (i, k, v) => setItems((x) => x.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const save = async () => {
    if (!guild) return;
    setSaving(true); setToast(null);
    try {
      const r = await fetch("/api/guild-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guild, feature, enabled, config: { items } }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setToast({ ok: true, msg: enabled ? "Saved — feature is ON." : "Saved — feature is OFF." });
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setSaving(false);
  };

  if (!loading && !guild) return <div className="card"><p className="muted">No server available yet.</p></div>;

  return (
    <div className="card" style={{ maxWidth: 860 }}>
      <div className="between" style={{ gap: 14, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          {description && <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{description}</div>}
        </div>
        <label className="switch"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /><span className="switch-track"><span className="switch-thumb" /></span></label>
      </div>

      <div style={{ marginTop: 16, opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? "auto" : "none" }}>
        <div className="fl-head">
          {columns.map((c) => <span key={c.key} style={{ flex: c.flex || 1 }}>{c.label}</span>)}
          <span style={{ width: 34 }} />
        </div>
        {items.length === 0 && <p className="muted" style={{ fontSize: 13, margin: "10px 0" }}>No entries yet — add one below.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((row, i) => (
            <div key={i} className="fl-row">
              {columns.map((c) => (
                c.type === "multi" ? (
                  <OptionMultiSelect key={c.key} options={c.options} value={row[c.key]} onChange={(v) => setCell(i, c.key, v)} placeholder={c.placeholder} style={{ flex: c.flex || 1, minWidth: 0 }} />
                ) : c.type === "roles" ? (
                  <MetaMultiSelect key={c.key} meta={meta} value={row[c.key]} onChange={(v) => setCell(i, c.key, v)} placeholder={c.placeholder} style={{ flex: c.flex || 1, minWidth: 0 }} />
                ) : isMetaType(c.type) ? (
                  <MetaSelect key={c.key} meta={meta} type={c.type} value={row[c.key]} onChange={(v) => setCell(i, c.key, v)} placeholder={c.placeholder} mono={c.mono} style={{ flex: c.flex || 1, minWidth: 0 }} />
                ) : c.type === "bool" ? (
                  <span key={c.key} style={{ flex: c.flex || 1, display: "flex", alignItems: "center" }}>
                    <label className="switch sm"><input type="checkbox" checked={!!row[c.key]} onChange={(e) => setCell(i, c.key, e.target.checked)} /><span className="switch-track"><span className="switch-thumb" /></span></label>
                  </span>
                ) : c.type === "select" ? (
                  <select key={c.key} value={row[c.key] ?? c.options?.[0] ?? ""} onChange={(e) => setCell(i, c.key, e.target.value)} style={{ flex: c.flex || 1, minWidth: 0 }}>
                    {(c.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : c.type === "textarea" ? (
                  <textarea key={c.key} rows={2} value={row[c.key] || ""} onChange={(e) => setCell(i, c.key, e.target.value)} placeholder={c.placeholder} style={{ flex: c.flex || 1, minWidth: 0 }} />
                ) : (
                  <input key={c.key} className={c.mono ? "mono" : ""} value={row[c.key] || ""} onChange={(e) => setCell(i, c.key, e.target.value)} placeholder={c.placeholder} style={{ flex: c.flex || 1, minWidth: 0 }} />
                )
              ))}
              <button className="btn ghost" style={{ width: 34, padding: "6px 0", color: "var(--danger)", flexShrink: 0 }} onClick={() => remove(i)} title="Remove">✕</button>
            </div>
          ))}
        </div>
        <button className="btn ghost" style={{ width: "auto", marginTop: 12 }} onClick={add}>+ {addLabel}</button>
      </div>

      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn" style={{ width: "auto" }} disabled={saving || loading} onClick={save}>{saving ? "Saving…" : "Save"}</button>
      </div>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
