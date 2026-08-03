"use client";
import { usePathname } from "next/navigation";

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
  return (
    <aside className="side">
      <div className="brand">zhd<span style={{ color: "var(--accent)" }}>.lol</span></div>
      <a className={`navlink ${path === "/dashboard" ? "active" : ""}`} href="/dashboard">Overview</a>
      {NAV.map((n, i) => {
        if (n.sec) {
          if (n.need === "cofounder" && !isCofounderPlus) return null;
          if (n.needGroup && !canGroup) return null;
          return <div key={i} className="navsec">{n.sec}</div>;
        }
        if (n.need === "cofounder" && !isCofounderPlus) return null;
        if (n.needGroup && !canGroup) return null;
        if (n.perm && !grants.includes(n.perm)) return null;
        return <a key={n.href} className={`navlink ${path === n.href ? "active" : ""}`} href={n.href}>{n.label}</a>;
      })}
      <div className="side-foot">
        <div className="avatar">{(user.name || "?")[0].toUpperCase()}</div>
        <div><div className="who">{user.name}</div><span className={`role-pill role-${user.role}`}>{user.role}</span></div>
      </div>
      <form action="/api/auth/logout" method="post" style={{ marginTop: 10 }}>
        <button className="btn ghost" style={{ fontSize: 13, padding: "8px" }}>Sign out</button>
      </form>
    </aside>
  );
}
