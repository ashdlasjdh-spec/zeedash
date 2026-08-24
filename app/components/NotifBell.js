"use client";
import { useEffect, useRef, useState } from "react";

// Notifications bell — surfaces recent high-signal events (bans, purges, antinuke, fake-perm changes,
// mass group ops) from /api/notifications. "Read" is a last-seen timestamp in localStorage, so the
// unread dot clears once you open the panel. Renders nothing for users without audit access (403).
const SEEN_KEY = "zhd-notif-seen";

export default function NotifBell() {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    try { setSeen(Number(localStorage.getItem(SEEN_KEY)) || 0); } catch {}
    let alive = true;
    const load = () => fetch("/api/notifications").then((r) => (r.ok ? r.json() : { items: [] })).then((j) => { if (alive) setItems(Array.isArray(j.items) ? j.items : []); }).catch(() => { if (alive) setItems([]); });
    load();
    const iv = setInterval(load, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!items || items.length === 0) return null;
  const unread = items.filter((i) => new Date(i.created_at).getTime() > seen).length;

  const toggle = () => {
    setOpen((o) => {
      const n = !o;
      if (n && items[0]) { const t = new Date(items[0].created_at).getTime(); setSeen(t); try { localStorage.setItem(SEEN_KEY, String(t)); } catch {} }
      return n;
    });
  };

  return (
    <div className="notif" ref={ref}>
      <button className="notif-btn" onClick={toggle} aria-label="Notifications" title="Notifications">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {unread > 0 && <span className="notif-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">Recent activity</div>
          <div className="notif-list">
            {items.map((i, idx) => (
              <div className="notif-item" key={idx}>
                <div className="notif-top"><span className="notif-action">{i.action}</span><span className="notif-time">{new Date(i.created_at).toLocaleString()}</span></div>
                <div className="notif-detail">{[i.actor_name, i.target, i.detail].filter(Boolean).join(" · ").slice(0, 160) || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
