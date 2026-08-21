"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGuildMeta, useGuilds, fieldsNeedMeta, isMetaType, MetaSelect, MetaMultiSelect } from "./metaFields";
import Dropdown from "./Dropdown";
import PanelPreview from "./PanelPreview";
import { cachedGuildSettings, loadGuildSettings, updateFeatureCache } from "@/lib/guildSettingsClient";

// Inline add/remove sub-list for a single field (e.g. Levels role rewards). Value is an array of rows.
function ListField({ value = [], cols = [], addLabel = "Add", onChange, meta }) {
  const rows = Array.isArray(value) ? value : [];
  const blank = () => Object.fromEntries(cols.map((c) => [c.key, ""]));
  const set = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, i) => (
          <div key={i} className="fl-row">
            {cols.map((c) => (
              c.type === "select"
                ? <Dropdown key={c.key} value={row[c.key] ?? c.options?.[0]?.value ?? c.options?.[0] ?? ""} onChange={(e) => set(i, c.key, e.target.value)} options={(c.options || []).map((o) => ({ value: o.value ?? o, label: o.label ?? o }))} style={{ flex: c.flex || 1, minWidth: 0 }} />
                : c.type === "roles"
                ? <MetaMultiSelect key={c.key} meta={meta} value={row[c.key]} onChange={(v) => set(i, c.key, v)} placeholder={c.placeholder || c.label} style={{ flex: c.flex || 1, minWidth: 0 }} />
                : isMetaType(c.type)
                ? <MetaSelect key={c.key} meta={meta} type={c.type} value={row[c.key]} onChange={(v) => set(i, c.key, v)} placeholder={c.placeholder || c.label} mono={c.mono} style={{ flex: c.flex || 1, minWidth: 0 }} />
                : <input key={c.key} className={c.mono ? "mono" : ""} value={row[c.key] || ""} onChange={(e) => set(i, c.key, e.target.value)} placeholder={c.placeholder || c.label} style={{ flex: c.flex || 1, minWidth: 0 }} />
            ))}
            <button className="btn ghost" style={{ width: 34, padding: "6px 0", color: "var(--danger)", flexShrink: 0 }} onClick={() => onChange(rows.filter((_, idx) => idx !== i))} title="Remove">✕</button>
          </div>
        ))}
      </div>
      <button className="btn ghost" style={{ width: "auto", marginTop: 10 }} onClick={() => onChange([...rows, blank()])}>+ {addLabel}</button>
    </div>
  );
}

// Reusable feature config card for the Server Management portal. Renders an Enable toggle (OFF by
// default) + the feature's fields, and persists to /api/guild-settings for the selected server
// (?guild=). The bot reads the same store and does nothing while the feature is disabled.
export default function FeatureSettings({ feature, title, description, fields = [], previewMode = null }) {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const guilds = useGuilds();
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const guild = guildParam || guilds[0]?.id || "";
  const meta = useGuildMeta(guild, fieldsNeedMeta(fields));

  useEffect(() => {
    if (!guild) return;
    let alive = true;
    const apply = (settings) => { const s = settings?.[feature] || {}; setEnabled(!!s.enabled); setConfig(s.config || {}); };
    // Instant paint from cache if we already have this guild's settings; otherwise show a skeleton.
    const cached = cachedGuildSettings(guild);
    if (cached) { apply(cached); setLoading(false); } else setLoading(true);
    loadGuildSettings(guild)
      .then((settings) => { if (alive) apply(settings); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [guild, feature]);

  const setField = (k, v) => setConfig((c) => ({ ...c, [k]: v }));
  const persist = async (en, cfg) => {
    if (!guild) return;
    setSaving(true); setToast(null);
    try {
      const r = await fetch("/api/guild-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guild, feature, enabled: en, config: cfg }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      updateFeatureCache(guild, feature, en, cfg); // keep the cache in step with what we just saved
      setToast({ ok: true, msg: en ? "Saved — feature is ON." : "Saved — feature is OFF." });
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setSaving(false);
  };
  const save = () => persist(enabled, config);
  const toggle = (checked) => { setEnabled(checked); persist(checked, config); }; // the on/off switch saves instantly

  if (!loading && !guild) return <div className="card"><p className="muted">No server available yet — the picker needs at least one server with recorded activity.</p></div>;

  // First load with no cached settings — show a shimmer instead of a blank/flashing form.
  if (loading) return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="skeleton-row" style={{ height: 30, width: "45%" }} />
        <div className="skeleton-row" style={{ height: 44 }} />
        <div className="skeleton-row" style={{ height: 44 }} />
        <div className="skeleton-row" style={{ height: 44 }} />
      </div>
    </div>
  );

  const inner = (
    <div className="card" style={previewMode ? { minWidth: 0 } : { maxWidth: 720 }}>
      <div className="between" style={{ gap: 14, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          {description && <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{description}</div>}
        </div>
        <label className="switch" title={enabled ? "Enabled" : "Disabled"}>
          <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} />
          <span className="switch-track"><span className="switch-thumb" /></span>
        </label>
      </div>

      <div style={{ marginTop: 16, opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? "auto" : "none", display: "flex", flexDirection: "column", gap: 13 }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label>{f.label}</label>
            {f.type === "roles" ? (
              <MetaMultiSelect meta={meta} value={config[f.key]} onChange={(v) => setField(f.key, v)} placeholder={f.placeholder} />
            ) : isMetaType(f.type) ? (
              <MetaSelect meta={meta} type={f.type} value={config[f.key]} onChange={(v) => setField(f.key, v)} placeholder={f.placeholder} mono={f.mono} />
            ) : f.type === "select" ? (
              <Dropdown value={config[f.key] ?? f.options?.[0]?.value ?? f.options?.[0] ?? ""} onChange={(e) => setField(f.key, e.target.value)} options={(f.options || []).map((o) => ({ value: o.value ?? o, label: o.label ?? o }))} />
            ) : f.type === "list" ? (
              <ListField value={config[f.key]} cols={f.cols} addLabel={f.addLabel} meta={meta} onChange={(v) => setField(f.key, v)} />
            ) : f.type === "textarea" ? (
              <textarea rows={f.rows || 3} value={config[f.key] || ""} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.placeholder} />
            ) : f.type === "bool" ? (
              <div><label className="switch sm"><input type="checkbox" checked={!!config[f.key]} onChange={(e) => setField(f.key, e.target.checked)} /><span className="switch-track"><span className="switch-thumb" /></span></label></div>
            ) : (
              <input className={f.mono ? "mono" : ""} value={config[f.key] || ""} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.placeholder} inputMode={f.numeric ? "numeric" : undefined} />
            )}
            {f.hint && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{f.hint}</div>}
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn" style={{ width: "auto" }} disabled={saving || loading} onClick={save}>{saving ? "Saving…" : "Save"}</button>
      </div>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );

  if (!previewMode) return inner;
  return (
    <div className="fs-preview-wrap">
      {inner}
      <div className="card fs-preview-card">
        <div className="fs-preview-label">Live preview — what members will see</div>
        <PanelPreview mode={previewMode} config={config} />
      </div>
    </div>
  );
}
