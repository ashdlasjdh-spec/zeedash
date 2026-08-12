"use client";
import { useState, useEffect } from "react";

// Field/column types that become dropdowns populated from the guild's channels/roles.
// "roles" (plural) is a multi-select (chip picker); the rest are single selects.
export const META_TYPES = ["channel", "voice", "category", "role", "roles"];
export const isMetaType = (t) => META_TYPES.includes(t);

export function fieldsNeedMeta(fields = []) {
  return fields.some((f) => isMetaType(f.type) || (f.cols || []).some((c) => isMetaType(c.type)));
}

// undefined = loading, null = failed (fall back to text), object = loaded.
export function useGuildMeta(guild, active) {
  const [meta, setMeta] = useState(undefined);
  useEffect(() => {
    if (!guild || !active) return;
    setMeta(undefined);
    fetch(`/api/guild-meta?guild=${guild}`)
      .then(async (r) => { const j = await r.json().catch(() => null); setMeta(r.ok && j && !j.error ? j : null); })
      .catch(() => setMeta(null));
  }, [guild, active]);
  return meta;
}

export function metaOptions(meta, type) {
  if (!meta) return [];
  if (type === "channel") return (meta.text || []).map((c) => ({ value: c.id, label: `# ${c.name}` }));
  if (type === "voice") return (meta.voice || []).map((c) => ({ value: c.id, label: `🔊 ${c.name}` }));
  if (type === "category") return (meta.categories || []).map((c) => ({ value: c.id, label: c.name }));
  if (type === "role") return (meta.roles || []).map((r) => ({ value: r.id, label: `@ ${r.name}` }));
  return [];
}

// A dropdown for a meta field. Falls back to a plain text ID input if the guild data couldn't load.
export function MetaSelect({ meta, type, value, onChange, placeholder, mono, style }) {
  if (meta === null) {
    return <input className={mono ? "mono" : ""} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />;
  }
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} style={style}>
      <option value="">{meta === undefined ? "Loading…" : "— none —"}</option>
      {metaOptions(meta, type).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Multi-role picker. Stores a comma-separated string of role IDs (what the bot parses). Shows chips
// with a remove ×, plus an "add role" dropdown of roles not yet picked. Falls back to a text box.
export function MetaMultiSelect({ meta, value, onChange, placeholder, style }) {
  if (meta === null) {
    return <input className="mono" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />;
  }
  const ids = String(value || "").split(/[\s,]+/).filter(Boolean);
  const roles = meta?.roles || [];
  const nameOf = (id) => roles.find((r) => r.id === id)?.name || id;
  const add = (id) => { if (id && !ids.includes(id)) onChange([...ids, id].join(",")); };
  const remove = (id) => onChange(ids.filter((x) => x !== id).join(","));
  const available = roles.filter((r) => !ids.includes(r.id));
  return (
    <div className="chips-field" style={style}>
      {ids.length > 0 && (
        <div className="chips">
          {ids.map((id) => (
            <span key={id} className="chip">@ {nameOf(id)}<button type="button" onClick={() => remove(id)} aria-label="Remove">×</button></span>
          ))}
        </div>
      )}
      <select value="" onChange={(e) => { add(e.target.value); e.target.value = ""; }}>
        <option value="">{meta === undefined ? "Loading…" : "+ Add role…"}</option>
        {available.map((r) => <option key={r.id} value={r.id}>@ {r.name}</option>)}
      </select>
    </div>
  );
}
