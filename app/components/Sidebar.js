"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { pillClassForLevel } from "@/lib/permissions";
import ServerSidebarNav from "./ServerSidebarNav";

// Feather-style line icons (inner paths), keyed by label.
const ICON = {
  Overview: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  Powers: ["M13 2 4 14h6l-1 8 9-12h-6l1-8z"],
  Stands: ["M12 2l2.9 6.3 6.6.6-5 4.4 1.5 6.5L12 17l-6 3.3 1.5-6.5-5-4.4 6.6-.6z"],
  Shazam: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12.8 7 9 12.6h2.6l-.6 4.4 3.9-5.7h-2.6l.5-4.3z"],
  "SVJ Car": ["M3 13l1.8-5.4A2 2 0 0 1 6.7 6.2h10.6a2 2 0 0 1 1.9 1.4L21 13v3a1 1 0 0 1-1 1h-1M3 13v3a1 1 0 0 1 1 1h1M3 13h18", "M7 17a1.5 1.5 0 1 0 0-.01", "M17 17a1.5 1.5 0 1 0 0-.01"],
  Gamepasses: ["M20 12a2 2 0 0 0 .7-3.9V6a2 2 0 0 0-2-2H5.3a2 2 0 0 0-2 2v2.1A2 2 0 0 1 4 12a2 2 0 0 1-.7 3.9V18a2 2 0 0 0 2 2h13.4a2 2 0 0 0 2-2v-2.1A2 2 0 0 1 20 12z", "M9 8v8"],
  Tools: ["M14.7 6.3a4 4 0 0 0-5.4 5.4l-6.6 6.6 2 2 6.6-6.6a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z"],
  "Start BR": ["M5 21V4", "M5 5h11l-1.5 3L16 11H5z"],
  Perks: ["M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"],
  "Crew Tags": ["M20 12l-8 8-9-9V4h7z", "M7.5 7.5h.01"],
  Emojis: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M8.5 14a4 4 0 0 0 7 0", "M9 9h.01", "M15 9h.01"],
  Bundles: ["M12 2l9 4.9V17L12 22 3 17V6.9z", "M3.3 7L12 12l8.7-5", "M12 12v10"],
  Group: ["M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"],
  Whitelist: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M17 11l2 2 4-4"],
  Bans: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M5.6 5.6l12.8 12.8"],
  Blacklist: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M5.6 5.6l12.8 12.8"],
  Lookup: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.3-4.3"],
  "Remove All": ["M3 6h18", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6", "M10 11v6", "M14 11v6"],
  "Audit Log": ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  "Temp Grants": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7.5v5l3 2"],
  Analytics: ["M3 21h18", "M6 21V11", "M11 21V5", "M16 21V14", "M21 21V8"],
  Server: ["M3 12h4l2.5 7 4-15L16 12h5"],
  Overview: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  Leaderboard: ["M8 21h8", "M12 17v4", "M7 4h10v4a5 5 0 0 1-10 0z", "M7 6H4v2a3 3 0 0 0 3 3", "M17 6h3v2a3 3 0 0 0-3 3"],
  Channels: ["M4 9h16", "M4 15h16", "M10 3 8 21", "M16 3l-2 18"],
  Security: ["M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z"],
  Automation: ["M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  Utility: ["M14.7 6.3a4 4 0 0 0-5.4 5.4l-6.6 6.6 2 2 6.6-6.6a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z"],
  Tickets: ["M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z", "M14 6v12"],
  "Message Builder": ["M8 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2", "M9 3h6v3H9z", "M8 11l2 2-2 2", "M13 15h3"],
  Settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 5.4 13H5a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 6.7 6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11 4.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9z"],
};
function Icon({ label }) {
  const paths = ICON[label] || [];
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const NAV = [
  { sec: "Perks", needAnyGrant: true },
  { href: "/dashboard/powers", label: "Powers", perm: "power" },
  { href: "/dashboard/stands", label: "Stands", perm: "stand" },
  { href: "/dashboard/car", label: "SVJ Car", perm: "car" },
  { href: "/dashboard/tools", label: "Tools", perm: "tool" },
  { href: "/dashboard/gamepasses", label: "Gamepasses", perm: "gamepass" },
  { href: "/dashboard/shazam", label: "Shazam", perm: "shazam" },
  { href: "/dashboard/startbr", label: "Start BR", perm: "startbr" },

  { sec: "Cosmetics", needCosmetic: true },
  { href: "/dashboard/tags", label: "Crew Tags", perm: "tag" },
  { href: "/dashboard/emojis", label: "Emojis", perm: "emoji" },

  { sec: "Grant Tools", needAnyGrant: true },
  { href: "/dashboard/bundles", label: "Bundles", need: "cofounder" },
  { href: "/dashboard/temp-grants", label: "Temp Grants", needAnyGrant: true },

  { sec: "Moderation", needBan: true },
  { href: "/dashboard/bans", label: "Bans", needBan: true },
  { href: "/dashboard/lookup", label: "Lookup", needBan: true },
  { href: "/dashboard/analytics", label: "Analytics", needGroup: true },

  { sec: "Group", needGroupAny: true },
  { href: "/dashboard/group", label: "Group", needGroupAny: true },

  { sec: "Insights", needConfig: true },
  { href: "/dashboard/audit", label: "Audit Log", needConfig: true },

  { sec: "Manage", needManage: true },
  { href: "/dashboard/whitelist", label: "Whitelist", need: "cofounder" },
  { href: "/dashboard/blacklist", label: "Blacklist", need: "cofounder" },
  { href: "/dashboard/settings", label: "Settings", need: "cofounder" },
  { href: "/dashboard/purge", label: "Remove All", needPurge: true },
];

export default function Sidebar({ user, grants, canGroup, canGroupScoped, canBan, canConfig, isCofounderPlus, canPurge, gameAccess = true, serverAccess = false }) {
  const canGroupAny = canGroup || canGroupScoped;
  const path = usePathname();
  const portal = path.startsWith("/dashboard/server") ? "server" : "game";
  const [open, setOpen] = useState(false);
  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [path]);
  const link = (href, label) => (
    <a key={href} className={`navlink ${path === href ? "active" : ""}`} href={href} onClick={() => setOpen(false)}>
      <Icon label={label} /><span>{label}</span>
    </a>
  );
  return (
    <>
      {/* Mobile-only top bar with a hamburger; hidden on desktop via CSS. */}
      <div className="mtopbar">
        <div className="brand">zhd<span>.lol</span></div>
        <button className={`hamb ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
          <span /><span /><span />
        </button>
      </div>
      {open && <div className="side-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`side ${open ? "open" : ""}`}>
        <div className="brand side-brand">zhd<span>.lol</span></div>

      {/* Portal switcher — only shown when the user can reach BOTH portals. Server-only Discord
          admins never see the Game tab; Game-only staff never see the Server tab. */}
      {gameAccess && serverAccess && (
        <div className="side-portals">
          <a className={`sp ${portal === "game" ? "on" : ""}`} href="/dashboard" onClick={() => setOpen(false)}>🎮 Game</a>
          <a className={`sp ${portal === "server" ? "on" : ""}`} href="/dashboard/server" onClick={() => setOpen(false)}>💬 Server</a>
        </div>
      )}

      {(portal === "server" || !gameAccess) ? (
        <Suspense fallback={null}><ServerSidebarNav Icon={Icon} onNavigate={() => setOpen(false)} /></Suspense>
      ) : (<>
      {link("/dashboard", "Overview")}
      {NAV.map((n, i) => {
        if (n.sec) {
          if (n.needAnyGrant && !grants.length) return null;
          if (n.needCosmetic && !grants.includes("tag") && !grants.includes("emoji")) return null;
          if (n.needBan && !canBan) return null;
          if (n.needGroupAny && !canGroupAny) return null;
          if (n.needGroup && !canGroup) return null;
          if (n.needConfig && !canConfig) return null;
          if (n.needManage && !isCofounderPlus && !canPurge) return null;
          return <div key={i} className="navsec">{n.sec}</div>;
        }
        if (n.need === "cofounder" && !isCofounderPlus) return null;
        if (n.needAnyGrant && !grants.length) return null;
        if (n.needPurge && !canPurge) return null;
        if (n.needGroupAny && !canGroupAny) return null;
        if (n.needConfig && !canConfig) return null;
        if (n.needGroup && !canGroup) return null;
        if (n.needBan && !canBan) return null;
        if (n.perm && !grants.includes(n.perm)) return null;
        return link(n.href, n.label);
      })}
      </>)}
      <div className="side-foot">
        <div className="avatar" style={user.avatar ? { background: "transparent", overflow: "hidden" } : undefined}>
          {user.avatar
            ? <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
            : (user.name || "?")[0].toUpperCase()}
          <span className="online" />
        </div>
        <div><div className="who">{user.name}</div><span className={`role-pill role-${pillClassForLevel(user.level)}`}>{user.role}</span></div>
      </div>
      <form action="/api/auth/logout" method="post" style={{ marginTop: 10 }}>
        <button className="btn ghost" style={{ fontSize: 13, padding: "9px" }}>Sign out</button>
      </form>
      </aside>
    </>
  );
}
