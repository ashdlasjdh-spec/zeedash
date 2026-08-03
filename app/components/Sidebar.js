"use client";
import { usePathname } from "next/navigation";

// Feather-style line icons (inner paths), keyed by label.
const ICON = {
  Overview: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  Powers: ["M13 2 4 14h6l-1 8 9-12h-6l1-8z"],
  Stands: ["M12 2l2.9 6.3 6.6.6-5 4.4 1.5 6.5L12 17l-6 3.3 1.5-6.5-5-4.4 6.6-.6z"],
  Gamepasses: ["M20 12a2 2 0 0 0 .7-3.9V6a2 2 0 0 0-2-2H5.3a2 2 0 0 0-2 2v2.1A2 2 0 0 1 4 12a2 2 0 0 1-.7 3.9V18a2 2 0 0 0 2 2h13.4a2 2 0 0 0 2-2v-2.1A2 2 0 0 1 20 12z", "M9 8v8"],
  Tools: ["M14.7 6.3a4 4 0 0 0-5.4 5.4l-6.6 6.6 2 2 6.6-6.6a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z"],
  Perks: ["M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"],
  "Crew Tags": ["M20 12l-8 8-9-9V4h7z", "M7.5 7.5h.01"],
  Emojis: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M8.5 14a4 4 0 0 0 7 0", "M9 9h.01", "M15 9h.01"],
  Group: ["M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"],
  Whitelist: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M17 11l2 2 4-4"],
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
  { sec: "Grant" },
  { href: "/dashboard/powers", label: "Powers", perm: "power" },
  { href: "/dashboard/stands", label: "Stands", perm: "stand" },
  { href: "/dashboard/gamepasses", label: "Gamepasses", perm: "gamepass" },
  { href: "/dashboard/tools", label: "Tools", perm: "tool" },
  { href: "/dashboard/perks", label: "Perks", perm: "perk" },
  { href: "/dashboard/tags", label: "Crew Tags", perm: "tag" },
  { href: "/dashboard/emojis", label: "Emojis", perm: "emoji" },
  { sec: "Moderation", needGroup: true },
  { href: "/dashboard/group", label: "Group", needGroup: true },
  { sec: "Manage", need: "cofounder" },
  { href: "/dashboard/whitelist", label: "Whitelist", need: "cofounder" },
  { href: "/dashboard/settings", label: "Settings", need: "cofounder" },
];

export default function Sidebar({ user, grants, canGroup, isCofounderPlus }) {
  const path = usePathname();
  const link = (href, label) => (
    <a key={href} className={`navlink ${path === href ? "active" : ""}`} href={href}>
      <Icon label={label} /><span>{label}</span>
    </a>
  );
  return (
    <aside className="side">
      <div className="brand">zhd<span>.lol</span></div>
      {link("/dashboard", "Overview")}
      {NAV.map((n, i) => {
        if (n.sec) {
          if (n.need === "cofounder" && !isCofounderPlus) return null;
          if (n.needGroup && !canGroup) return null;
          return <div key={i} className="navsec">{n.sec}</div>;
        }
        if (n.need === "cofounder" && !isCofounderPlus) return null;
        if (n.needGroup && !canGroup) return null;
        if (n.perm && !grants.includes(n.perm)) return null;
        return link(n.href, n.label);
      })}
      <div className="side-foot">
        <div className="avatar">{(user.name || "?")[0].toUpperCase()}<span className="online" /></div>
        <div><div className="who">{user.name}</div><span className={`role-pill role-${user.role}`}>{user.role}</span></div>
      </div>
      <form action="/api/auth/logout" method="post" style={{ marginTop: 10 }}>
        <button className="btn ghost" style={{ fontSize: 13, padding: "9px" }}>Sign out</button>
      </form>
    </aside>
  );
}
