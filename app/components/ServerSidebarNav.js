"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import ServerPicker from "./ServerPicker";
import { useGuilds } from "./metaFields";

// Feature slugs that are only shown to a guild's owner / antinuke admins (or top staff).
const SECURITY_SLUGS = new Set(["antinuke", "antiraid"]);

// Top-level single links (icons come from the Sidebar ICON map via the Icon prop). `slug` (when set)
// is the feature this link maps to, so it can be hidden when the user can't manage that feature.
const TOP = [
  { href: "/dashboard/server", label: "Overview" },
  { href: "/dashboard/server/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/server/message-builder", label: "Message Builder", slug: "message-builder" },
];
// Collapsible sections (bleed/greed-style). [label, slug] — slug maps to /dashboard/server/<slug>.
const SECTIONS = [
  { label: "Settings", items: [["General", "settings-general"], ["Customize", "customize"], ["AutoPFP", "autopfp"], ["Restrict", "restrict"], ["Disable", "disable"]] },
  { label: "Security", items: [["Fake Permissions", "fake-permissions"], ["Automod", "automod"], ["Antiraid", "antiraid"], ["Antinuke", "antinuke"], ["Honeypot", "honeypot"]] },
  { label: "Automation", items: [["Autoresponder", "autoresponder"], ["Autoreact", "autoreact"], ["Autorole", "autorole"], ["Ping on Join", "pingonjoin"], ["Tracking", "tracking"]] },
  { label: "Utility", items: [["Bump Reminder", "bump"], ["Button Roles", "button-roles"], ["Levels", "levels"], ["Reaction Roles", "reaction-roles"], ["Sticky Message", "sticky"]] },
  { label: "Server", items: [["Starboard", "starboard"], ["Welcome", "welcome"], ["Goodbye", "goodbye"], ["Aliases", "aliases"], ["Logs", "logs"], ["VoiceMaster", "voicemaster"]] },
];
const BOTTOM = [{ href: "/dashboard/server/tickets", label: "Tickets", slug: "tickets" }];

export default function ServerSidebarNav({ Icon, onNavigate }) {
  const path = usePathname();
  const sp = useSearchParams();
  const guilds = useGuilds();
  // Resolve the effective guild the same way the picker and pages do: the ?guild= param, else the
  // first available server. Without this, landing on the section with no param left the nav with no
  // guild to check access against, so it hid every feature until a param settled (needed reloads).
  const g = sp.get("guild") || guilds[0]?.id || "";
  const q = g ? `?guild=${g}` : "";
  const active = (href) => path === href;

  // Per-guild access snapshot: { manage (Discord admin/owner), security (antinuke/antiraid),
  // manageable (non-security slugs a manual-permission holder may manage) }. Hides Antinuke/Antiraid
  // unless owner/antinuke-admin, and — for manual-permission users — hides every feature their perms
  // don't unlock. Null while loading = optimistic (show all); the server enforces regardless.
  const [access, setAccess] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!g) { setAccess(null); return; } // no server resolved yet — stay optimistic (show all) until it loads
    fetch(`/api/guild-access?guild=${g}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setAccess({ manage: !!j.manage, security: !!j.security, manageable: Array.isArray(j.manageable) ? j.manageable : [] }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [g]);
  // Can the user see/manage a given feature slug in the selected guild?
  const canSee = (slug) => {
    if (!access) return true;                       // still loading — optimistic
    if (SECURITY_SLUGS.has(slug)) return access.security;
    if (access.manage) return true;                 // Discord admin manages all non-security features
    return access.manageable.includes(slug);        // otherwise only what their manual perms unlock
  };
  const visibleItems = (items) => items.filter(([, slug]) => canSee(slug));

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
      {TOP.filter((n) => !n.slug || canSee(n.slug)).map((n) => link(n.href, n.label))}
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
      {BOTTOM.filter((n) => !n.slug || canSee(n.slug)).map((n) => link(n.href, n.label))}
    </>
  );
}
