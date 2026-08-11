"use client";
import { useState, useRef, useEffect } from "react";

// Custom themed dropdown to replace native <select> (whose open list is OS-styled and can't be
// themed). API mirrors a select: `value`, `onChange` (emits { target: { value } }), and `options`
// = [{ value, label }]. Closes on outside-click/Escape; arrow keys + Enter navigate.
export default function Dropdown({ value, onChange, options = [], placeholder = "Select…", disabled = false, style, className = "", minWidth }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const ref = useRef(null);
  const sel = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  useEffect(() => { if (open) setHi(options.findIndex((o) => String(o.value) === String(value))); }, [open]); // eslint-disable-line

  function pick(o) { onChange?.({ target: { value: o.value } }); setOpen(false); }
  function onKey(e) {
    if (disabled) return;
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (options[hi]) pick(options[hi]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div className={`dd ${className} ${disabled ? "dd-dis" : ""}`} ref={ref} style={{ ...(minWidth ? { minWidth } : {}), ...style }}>
      <button type="button" className={`dd-btn ${open ? "open" : ""}`} disabled={disabled} onClick={() => !disabled && setOpen((o) => !o)} onKeyDown={onKey} aria-haspopup="listbox" aria-expanded={open}>
        <span className="dd-val">{sel ? sel.label : <span className="dd-ph">{placeholder}</span>}</span>
        <svg className="dd-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="dd-list" role="listbox">
          {options.length === 0 && <div className="dd-empty">No options</div>}
          {options.map((o, i) => (
            <button
              type="button" key={o.value} role="option" aria-selected={String(o.value) === String(value)}
              className={`dd-opt ${String(o.value) === String(value) ? "sel" : ""} ${i === hi ? "hi" : ""}`}
              onMouseEnter={() => setHi(i)} onClick={() => pick(o)}
            >
              <span>{o.label}</span>
              {String(o.value) === String(value) && <svg className="dd-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
