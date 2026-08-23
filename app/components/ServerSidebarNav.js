"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import ServerPicker from "./ServerPicker";
import { useGuilds } from "./metaFields";
import { FEATURE_GROUPS as SECTIONS, TOP_LINKS as TOP, SECURITY_SLUGS as SEC_LIST } from "@/lib/serverFeatures";

// Feature slugs that are only shown to a guild's owner / antinuke admins (or top staff).
const SECURITY_SLUGS = new Set(SEC_LIST);

export default function ServerSidebarNav({ Icon, onNavigate, superOwner = false }) {
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
  const visibleItems = (items) => items.filter((i) => canSee(i.slug));

  const [open, setOpen] = useState(() => {
    const o = {};
    for (const s of SECTIONS) o[s.label] = s.items.some((i) => path === `/bot/${i.slug}`);
    return o;
  });
  const toggle = (label) => setOpen((o) => ({ ...o, [label]: !o[label] }));

  const link = (href, label) => (
    <Link key={href} className={`navlink ${active(href) ? "active" : ""}`} href={`${href}${q}`} onClick={onNavigate}>
      <Icon label={label} /><span>{label}</span>
    </Link>
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
              {items.map((i) => {
                const href = `/bot/${i.slug}`;
                return <Link key={i.slug} className={`nav-sub-link ${active(href) ? "active" : ""}`} href={`${href}${q}`} onClick={onNavigate}>{i.label}</Link>;
              })}
            </div>
          )}
        </div>
        );
      })}
      {superOwner && (
        <>
          <div className="nav-sep" />
          <Link className={`navlink ${path === "/bot/role-access" ? "active" : ""}`} href="/bot/role-access" onClick={onNavigate}>
            <Icon label="Security" /><span>Role Access</span>
          </Link>
        </>
      )}
    </>
  );
}
