"use client";
import { useState, useEffect } from "react";
import Dropdown from "./Dropdown";

// Shared, cached list of servers (the picker + every feature page use it). Returns the cached list
// instantly on navigation so pages never flash "No servers yet" / "No server available" while loading.
let guildsCache = null;
export function useGuilds() {
  const [guilds, setGuilds] = useState(() => guildsCache || []);
  useEffect(() => {
    let alive = true;
    fetch("/api/server-stats/guilds").then((r) => r.json()).then((j) => { const g = j.guilds || []; guildsCache = g; if (alive) setGuilds(g); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return guilds;
}

// Field/column types that become dropdowns populated from the guild's channels/roles.
// "roles" (plural) is a multi-select (chip picker); the rest are single selects.
export const META_TYPES = ["channel", "voice", "category", "role", "roles"];
export const isMetaType = (t) => META_TYPES.includes(t);

export function fieldsNeedMeta(fields = []) {
  return fields.some((f) => isMetaType(f.type) || (f.cols || []).some((c) => isMetaType(c.type)));
}

// Client-side cache (15s) so channel/role dropdowns load instantly on navigation, but stay fresh:
// shows cached data immediately, refetches in the background when stale, AND refetches whenever you
// return to the tab — so a channel/role you just created in Discord shows up when you switch back.
const metaCache = new Map(); // guild -> { at, data }
const META_TTL = 15000;
export function useGuildMeta(guild, active) {
  const [meta, setMeta] = useState(() => (guild && metaCache.get(guild)?.data) || undefined);
  useEffect(() => {
    if (!guild || !active) return;
    let alive = true;
    const load = async (force) => {
      const c = metaCache.get(guild);
      if (c) setMeta(c.data); // show cached immediately, no loading flash
      if (!force && c && Date.now() - c.at < META_TTL) return;
      try {
        const r = await fetch(`/api/guild-meta?guild=${guild}${force ? "&fresh=1" : ""}`); // force bypasses server cache
        const j = await r.json().catch(() => null);
        const val = r.ok && j && !j.error ? j : null;
        if (val) metaCache.set(guild, { at: Date.now(), data: val });
        if (alive) setMeta(val ?? (c ? c.data : null));
      } catch { if (alive && !c) setMeta(null); }
    };
    load(false);
    // Refetch when you return to the tab (e.g. after making a channel in Discord) — covers the common
    // case without polling. Cheap: only fires on focus, and the fresh=1 pull bypasses the caches.
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => { alive = false; window.removeEventListener("focus", onFocus); };
  }, [guild, active]);
  return meta;
}

export function metaOptions(meta, type) {
  if (!meta) return [];
  if (type === "channel") return (meta.text || []).map((c) => ({ value: c.id, label: `# ${c.name}` }));
  if (type === "voice") return (meta.voice || []).map((c) => ({ value: c.id, label: `${c.name}` }));
  if (type === "category") return (meta.categories || []).map((c) => ({ value: c.id, label: c.name }));
  if (type === "role") return (meta.roles || []).map((r) => ({ value: r.id, label: `@ ${r.name}` }));
  return [];
}

// A dropdown for a meta field. Falls back to a plain text ID input if the guild data couldn't load.
export function MetaSelect({ meta, type, value, onChange, placeholder, mono, style }) {
  if (meta === null) {
    return <input className={mono ? "mono" : ""} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />;
  }
  const opts = [{ value: "", label: meta === undefined ? "Loading…" : "— none —" }, ...metaOptions(meta, type)];
  return <Dropdown value={value || ""} onChange={(e) => onChange(e.target.value)} options={opts} placeholder={meta === undefined ? "Loading…" : "— none —"} style={style} />;
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
      <Dropdown value="" onChange={(e) => add(e.target.value)} options={available.map((r) => ({ value: r.id, label: `@ ${r.name}` }))} placeholder={meta === undefined ? "Loading…" : "+ Add role…"} />
    </div>
  );
}

// Multi-select of a FIXED option list (chips). Stored as a comma-separated string of values.
export function OptionMultiSelect({ options = [], value, onChange, placeholder, style }) {
  const ids = String(value || "").split(/[\s,]+/).filter(Boolean);
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const labelOf = (v) => opts.find((o) => o.value === v)?.label || v;
  const add = (v) => { if (v && !ids.includes(v)) onChange([...ids, v].join(",")); };
  const remove = (v) => onChange(ids.filter((x) => x !== v).join(","));
  const available = opts.filter((o) => !ids.includes(o.value));
  return (
    <div className="chips-field" style={style}>
      {ids.length > 0 && (
        <div className="chips">
          {ids.map((v) => <span key={v} className="chip">{labelOf(v)}<button type="button" onClick={() => remove(v)} aria-label="Remove">×</button></span>)}
        </div>
      )}
      <Dropdown value="" onChange={(e) => add(e.target.value)} options={available} placeholder={placeholder || "+ Add…"} />
    </div>
  );
}
