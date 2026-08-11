"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { pillClassForLevel } from "@/lib/permissions";

// Floating top pill: brand far-left, role-aware links + an "All" mega-menu centered, and the
// signed-in Discord user (pfp + name -> a detailed account menu) far-right. Desktop only —
// mobile keeps the Sidebar's hamburger bar.
export default function Topbar({ user, links = [], allGroups = [], canSettings = false }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);   // account menu
  const [all, setAll] = useState(false);      // mega menu
  const [copied, setCopied] = useState(false);
  const accRef = useRef(null);
  const allRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (accRef.current && !accRef.current.contains(e.target)) setMenu(false);
      if (allRef.current && !allRef.current.contains(e.target)) setAll(false);
    };
    const onEsc = (e) => { if (e.key === "Escape") { setMenu(false); setAll(false); } };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onEsc); };
  }, []);
  useEffect(() => { setMenu(false); setAll(false); }, [path]);

  const pfp = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null;
  const isActive = (href) => (href === "/dashboard" ? path === "/dashboard" : path.startsWith(href));

  async function copyId() {
    try { await navigator.clipboard.writeText(String(user.id)); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
  }

  return (
    <div className="topbar">
      <div className="tb-pill">
        <a className="tb-brand" href="/dashboard">zhd<span>.lol</span></a>

        <nav className="tb-links">
          {links.map((l) => (
            <a key={l.href} className={`tb-link ${isActive(l.href) ? "active" : ""}`} href={l.href}>{l.label}</a>
          ))}
          <div className="tb-all-wrap" ref={allRef}>
            <button className={`tb-link tb-all ${all ? "active" : ""}`} onClick={() => setAll((v) => !v)} aria-haspopup="menu" aria-expanded={all}>
              All
              <svg className="tb-caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {all && (
              <div className="tb-mega" role="menu">
                {allGroups.map((g) => (
                  <div className="tb-mega-col" key={g.sec}>
                    <div className="tb-mega-h">{g.sec}</div>
                    {g.items.map((it) => (
                      <a key={it.href} className={`tb-mega-link ${isActive(it.href) ? "active" : ""}`} href={it.href}>{it.label}</a>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="tb-user-wrap" ref={accRef}>
          <button className="tb-user" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}>
            {pfp ? <img className="tb-pfp" src={pfp} alt="" referrerPolicy="no-referrer" /> : <span className="tb-pfp">{(user.name || "?")[0].toUpperCase()}</span>}
            <span className="tb-name">{user.name}</span>
            <svg className="tb-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {menu && (
            <div className="tb-menu" role="menu">
              <div className="tb-menu-head">
                {pfp ? <img className="tb-menu-pfp" src={pfp} alt="" referrerPolicy="no-referrer" /> : <span className="tb-menu-pfp">{(user.name || "?")[0].toUpperCase()}</span>}
                <div style={{ minWidth: 0 }}>
                  <div className="tb-menu-name">{user.name}</div>
                  <span className={`role-pill role-${pillClassForLevel(user.level)}`}>{user.role}</span>
                </div>
              </div>
              <div className="tb-menu-meta">
                <button className="tb-kv" onClick={copyId} title="Copy Discord ID">
                  <span className="tb-kv-k">Discord ID</span>
                  <span className="tb-kv-v mono">{copied ? "Copied ✓" : user.id}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, opacity: .6 }}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                  </span>
                </button>
                <div className="tb-kv">
                  <span className="tb-kv-k">Access level</span>
                  <span className="tb-kv-v mono">{user.level}</span>
                </div>
              </div>
              <div className="tb-menu-links">
                <a className="tb-mi" href="/dashboard">Overview</a>
                {canSettings && <a className="tb-mi" href="/dashboard/settings">Settings</a>}
                <a className="tb-mi" href={`https://discord.com/users/${user.id}`} target="_blank" rel="noreferrer">Discord profile ↗</a>
              </div>
              <form action="/api/auth/logout" method="post">
                <button className="tb-mi tb-signout" type="submit">Sign out</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
