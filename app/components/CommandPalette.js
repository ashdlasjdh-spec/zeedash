"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { applyTheme, applyDensity } from "./ThemeControls";

// Built-in ACTIONS — things you can DO, not just pages to open. Each has a run() instead of an href.
function buildActions() {
  const curTheme = () => { try { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; } catch { return "dark"; } };
  const curDensity = () => { try { return document.documentElement.dataset.density === "compact" ? "compact" : "comfortable"; } catch { return "comfortable"; } };
  return [
    { label: "Toggle light / dark theme", group: "Action", run: () => applyTheme(curTheme() === "light" ? "dark" : "light") },
    { label: "Toggle compact density", group: "Action", run: () => applyDensity(curDensity() === "compact" ? "comfortable" : "compact") },
    { label: "Scroll to top", group: "Action", run: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { label: "Sign out", group: "Action", run: () => { const f = document.createElement("form"); f.method = "post"; f.action = "/api/auth/logout"; document.body.appendChild(f); f.submit(); } },
  ];
}

// Global command palette. Open with Cmd/Ctrl-K (or the top-bar search button, which fires a
// "cmdk:open" event). Fuzzy-filters every page the signed-in rank can reach; arrow keys +
// Enter navigate. Renders nothing until opened.
export default function CommandPalette({ items = [] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("cmdk:open", onOpen);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("cmdk:open", onOpen); };
  }, []);
  useEffect(() => { if (open) { setQ(""); setIdx(0); const t = setTimeout(() => inputRef.current?.focus(), 20); return () => clearTimeout(t); } }, [open]);

  const all = useMemo(() => [...items, ...buildActions()], [items]);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = !s ? all : all.filter((it) => it.label.toLowerCase().includes(s) || it.group.toLowerCase().includes(s));
    return list.slice(0, 40);
  }, [q, all]);
  useEffect(() => { setIdx(0); }, [q]);

  function go(it) { if (!it) return; setOpen(false); if (it.run) it.run(); else if (it.href) router.push(it.href); }
  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(results[idx]); }
  }

  if (!open) return null;
  return (
    <div className="cmdk-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="cmdk" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="cmdk-inputwrap">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", flexShrink: 0 }}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={inputRef} className="cmdk-input" placeholder="Search pages…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} />
          <kbd className="cmdk-kbd">esc</kbd>
        </div>
        <div className="cmdk-list">
          {results.length === 0 && <div className="cmdk-empty">No matches for “{q}”.</div>}
          {results.map((it, i) => (
            <button key={it.href || it.label} className={`cmdk-item ${i === idx ? "sel" : ""}`} onMouseEnter={() => setIdx(i)} onClick={() => go(it)}>
              <span className="cmdk-label">{it.label}</span>
              <span className="cmdk-group">{it.group}</span>
            </button>
          ))}
        </div>
        <div className="cmdk-foot"><span><kbd className="cmdk-kbd">↑</kbd><kbd className="cmdk-kbd">↓</kbd> navigate</span><span><kbd className="cmdk-kbd">↵</kbd> open</span></div>
      </div>
    </div>
  );
}
