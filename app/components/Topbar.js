"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

// Floating top pill (guns.lol style): brand far-left, role-aware links centered, and the
// signed-in Discord user (pfp + display name, click for a menu) far-right. Desktop only —
// mobile keeps the existing hamburger bar/drawer from the Sidebar.
export default function Topbar({ user, links = [] }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  useEffect(() => { setMenu(false); }, [path]);

  const pfp = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : null;
  const isActive = (href) => (href === "/dashboard" ? path === "/dashboard" : path.startsWith(href));

  return (
    <div className="topbar">
      <div className="tb-pill">
        <a className="tb-brand" href="/dashboard">zhd<span>.lol</span></a>

        <nav className="tb-links">
          {links.map((l) => (
            <a key={l.href} className={`tb-link ${isActive(l.href) ? "active" : ""}`} href={l.href}>{l.label}</a>
          ))}
        </nav>

        <div className="tb-user-wrap" ref={ref}>
          <button className="tb-user" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}>
            {pfp
              ? <img className="tb-pfp" src={pfp} alt="" referrerPolicy="no-referrer" />
              : <span className="tb-pfp">{(user.name || "?")[0].toUpperCase()}</span>}
            <span className="tb-name">{user.name}</span>
            <svg className="tb-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {menu && (
            <div className="tb-menu" role="menu">
              <div className="tb-role">Signed in as <b>{user.role}</b></div>
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
