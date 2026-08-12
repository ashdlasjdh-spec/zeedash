"use client";
import { usePathname, useSearchParams } from "next/navigation";
import ServerPicker from "./ServerPicker";

const ITEMS = [
  { href: "/dashboard/server", label: "Overview" },
  { href: "/dashboard/server/leaderboard", label: "Leaderboard" },
];

// The Server Management sidebar: the server picker + its nav. Nav links carry the current ?guild=
// so switching Overview/Leaderboard keeps the chosen server. Wrapped in <Suspense> by the parent
// because it reads the search params.
export default function ServerSidebarNav({ Icon, onNavigate }) {
  const path = usePathname();
  const sp = useSearchParams();
  const g = sp.get("guild");
  const q = g ? `?guild=${g}` : "";
  return (
    <>
      <ServerPicker />
      <div className="navsec">Server Management</div>
      {ITEMS.map((n) => (
        <a key={n.href} className={`navlink ${path === n.href ? "active" : ""}`} href={`${n.href}${q}`} onClick={onNavigate}>
          <Icon label={n.label} /><span>{n.label}</span>
        </a>
      ))}
    </>
  );
}
