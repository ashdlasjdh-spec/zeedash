"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import ServerPicker from "./ServerPicker";

// Feature slugs that are only shown to a guild's owner / antinuke admins (or top staff).
const SECURITY_SLUGS = new Set(["antinuke", "antiraid"]);

// Top-level single links (icons come from the Sidebar ICON map via the Icon prop).
const TOP = [
  { href: "/dashboard/server", label: "Overview" },
  { href: "/dashboard/server/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/server/message-builder", label: "Message Builder" },
];
// Collapsible sections (bleed/greed-style). [label, slug] — slug maps to /dashboard/server/<slug>.
const SECTIONS = [
  { label: "Settings", items: [["General", "settings-general"], ["Customize", "customize"], ["AutoPFP", "autopfp"], ["Restrict", "restrict"], ["Disable", "disable"]] },
  { label: "Security", items: [["Fake Permissions", "fake-permissions"], ["Automod", "automod"], ["Antiraid", "antiraid"], ["Antinuke", "antinuke"], ["Honeypot", "honeypot"]] },
  { label: "Automation", items: [["Autoresponder", "autoresponder"], ["Autoreact", "autoreact"], ["Autorole", "autorole"], ["Ping on Join", "pingonjoin"], ["Tracking", "tracking"]] },
  { label: "Utility", items: [["Bump Reminder", "bump"], ["Button Roles", "button-roles"], ["Levels", "levels"], ["Reaction Roles", "reaction-roles"], ["Sticky Message", "sticky"]] },
  { label: "Server", items: [["Starboard", "starboard"], ["Welcome", "welcome"], ["Goodbye", "goodbye"], ["Aliases", "aliases"], ["Logs", "logs"], ["VoiceMaster", "voicemaster"]] },
];
const BOTTOM = [{ href: "/dashboard/server/tickets", label: "Tickets" }];

export default function ServerSidebarNav({ Icon, onNavigate }) {
  const path = usePathname();
  const sp = useSearchParams();
  const g = sp.get("guild");
  const q = g ? `?guild=${g}` : "";
  const active = (href) => path === href;

  // Per-guild access: hide Antinuke/Antiraid unless the user is the guild owner / an antinuke admin.
  const [security, setSecurity] = useState(true); // optimistic until we know (server also enforces)
  useEffect(() => {
    let alive = true;
    if (!g) { setSecurity(false); return; }
    fetch(`/api/guild-access?guild=${g}`).then((r) => r.json()).then((j) => { if (alive) setSecurity(!!j.security); }).catch(() => {});
    return () => { alive = false; };
  }, [g]);
  const visibleItems = (items) => items.filter(([, slug]) => security || !SECURITY_SLUGS.has(slug));

  const [open, setOpen] = useState(() => {
    const o = {};
    for (const s of SECTIONS) o[s.label] = s.items.some(([, slug]) => path === `/dashboard/server/${slug}`);
    return o;
  });
  const toggle = (label) => setOpen((o) => ({ ...o, [label]: !o[label] }));

  const link = (href, label) => (
    <a key={href} className={`navlink ${active(href) ? "active" : ""}`} href={`${href}${q}`} onClick={onNavigate}>
      <Icon label={label} /><span>{label}</span>
    </a>
  );

  return (
    <>
      <ServerPicker />
      {TOP.map((n) => link(n.href, n.label))}
      {SECTIONS.map((sec) => {
        const items = visibleItems(sec.items);
        if (!items.length) return null; // e.g. Security with nothing visible
        return (
        <div className="nav-group" key={sec.label}>
          <button className={`nav-group-h ${open[sec.label] ? "on" : ""}`} onClick={() => toggle(sec.label)} aria-expanded={!!open[sec.label]}>
            <Icon label={sec.label} /><span>{sec.label}</span>
            <svg className="nav-chev" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {open[sec.label] && (
            <div className="nav-sub">
              {items.map(([label, slug]) => {
                const href = `/dashboard/server/${slug}`;
                return <a key={slug} className={`nav-sub-link ${active(href) ? "active" : ""}`} href={`${href}${q}`} onClick={onNavigate}>{label}</a>;
              })}
            </div>
          )}
        </div>
        );
      })}
      {BOTTOM.map((n) => link(n.href, n.label))}
    </>
  );
}
