import { getSession } from "@/lib/session";
import { grantsFor, canGroup, canGroupScoped, canGroupAny, canWhitelist, canBan, canPurge, canManageGrants } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CommandPalette from "../components/CommandPalette";

export const dynamic = "force-dynamic";

const GRANT_HREF = {
  power: "/dashboard/powers", stand: "/dashboard/stands", car: "/dashboard/car", tool: "/dashboard/tools",
  gamepass: "/dashboard/gamepasses", shazam: "/dashboard/shazam", startbr: "/dashboard/startbr", tag: "/dashboard/tags", emoji: "/dashboard/emojis",
};
const GRANT_LABEL = {
  power: "Powers", stand: "Stands", car: "SVJ Car", tool: "Tools", gamepass: "Gamepasses",
  shazam: "Shazam", startbr: "Start BR", tag: "Crew Tags", emoji: "Emojis",
};

export default async function DashLayout({ children }) {
  const user = await getSession();
  if (!user) redirect("/");
  const lvl = user.level;
  const grants = grantsFor(lvl);

  // Centered quick links — a short set of the most-used destinations for this rank.
  const links = [{ label: "Overview", href: "/dashboard" }];
  if (grants.length) links.push({ label: "Grants", href: GRANT_HREF[grants[0]] });
  if (canBan(lvl)) links.push({ label: "Moderation", href: "/dashboard/bans" });
  if (canGroupAny(lvl)) links.push({ label: "Group", href: "/dashboard/group" });
  if (canManageGrants(lvl)) links.push({ label: "Audit", href: "/dashboard/audit" });

  // "All" mega-menu — every page this rank can reach, grouped.
  const grantItems = [{ label: "Overview", href: "/dashboard" }, ...grants.map((c) => ({ label: GRANT_LABEL[c], href: GRANT_HREF[c] }))];
  if (canManageGrants(lvl)) grantItems.push({ label: "Bundles", href: "/dashboard/bundles" });
  if (grants.length) grantItems.push({ label: "Temp Grants", href: "/dashboard/temp-grants" });
  const allGroups = [{ sec: "Grant", items: grantItems }];
  const mod = [];
  if (canBan(lvl)) mod.push({ label: "Bans", href: "/dashboard/bans" }, { label: "Lookup", href: "/dashboard/lookup" });
  if (canGroupAny(lvl)) mod.push({ label: "Group", href: "/dashboard/group" });
  if (canGroup(lvl)) mod.push({ label: "Audit Log", href: "/dashboard/audit" }, { label: "Analytics", href: "/dashboard/analytics" });
  if (mod.length) allGroups.push({ sec: "Moderation", items: mod });
  const manage = [];
  if (canWhitelist(lvl)) manage.push({ label: "Whitelist", href: "/dashboard/whitelist" }, { label: "Settings", href: "/dashboard/settings" });
  if (canPurge(user.id)) manage.push({ label: "Remove All", href: "/dashboard/purge" });
  if (manage.length) allGroups.push({ sec: "Manage", items: manage });

  // Flattened, de-duplicated list for the ⌘K command palette.
  const seen = new Set();
  const cmdItems = [];
  for (const g of allGroups) for (const it of g.items) { if (seen.has(it.href)) continue; seen.add(it.href); cmdItems.push({ ...it, group: g.sec }); }

  return (
    <div className="shell">
      <Sidebar user={user} grants={grants} canGroup={canGroup(lvl)} canGroupScoped={canGroupScoped(lvl)} canBan={canBan(lvl)} isCofounderPlus={canWhitelist(lvl)} canPurge={canPurge(user.id)} />
      <div className="content">
        <Topbar user={user} links={links} allGroups={allGroups} canSettings={canWhitelist(lvl)} />
        <CommandPalette items={cmdItems} />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
