"use client";
import { useEffect, useState } from "react";

// Small theme (dark/light) + density (comfortable/compact) control. State lives on <html> via
// data-theme / data-density (set pre-paint by the inline script in the root layout) and persists to
// localStorage. Also exposes window events so the command palette can toggle without importing this.
function getTheme() { try { return document.documentElement.dataset.theme || (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark"); } catch { return "dark"; } }
function getDensity() { try { return document.documentElement.dataset.density === "compact" ? "compact" : "comfortable"; } catch { return "comfortable"; } }

export function applyTheme(theme) {
  try { document.documentElement.dataset.theme = theme; localStorage.setItem("zhd-theme", theme); } catch {}
  window.dispatchEvent(new Event("zhd:theme"));
}
export function applyDensity(density) {
  try {
    if (density === "compact") document.documentElement.dataset.density = "compact";
    else delete document.documentElement.dataset.density;
    localStorage.setItem("zhd-density", density);
  } catch {}
  window.dispatchEvent(new Event("zhd:theme"));
}

export default function ThemeControls() {
  const [theme, setTheme] = useState("dark");
  const [density, setDensity] = useState("comfortable");
  useEffect(() => {
    const sync = () => { setTheme(getTheme()); setDensity(getDensity()); };
    sync();
    window.addEventListener("zhd:theme", sync);
    return () => window.removeEventListener("zhd:theme", sync);
  }, []);

  return (
    <div className="theme-controls">
      <button className={`tc-btn ${theme === "dark" ? "on" : ""}`} onClick={() => applyTheme("dark")} title="Dark theme" aria-label="Dark theme">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
      </button>
      <button className={`tc-btn ${theme === "light" ? "on" : ""}`} onClick={() => applyTheme("light")} title="Light theme" aria-label="Light theme">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
      </button>
      <span className="tc-sep" />
      <button className={`tc-btn ${density === "comfortable" ? "on" : ""}`} onClick={() => applyDensity("comfortable")} title="Comfortable spacing" aria-label="Comfortable spacing">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <button className={`tc-btn ${density === "compact" ? "on" : ""}`} onClick={() => applyDensity("compact")} title="Compact spacing" aria-label="Compact spacing">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 5h16M4 9h16M4 13h16M4 17h16M4 21h16" /></svg>
      </button>
    </div>
  );
}
