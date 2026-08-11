import { getSession } from "@/lib/session";
import { grantsFor, canGroup, canWhitelist, canBan, canPurge, canManageGrants } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export const dynamic = "force-dynamic";

const GRANT_HREF = {
  power: "/dashboard/powers", stand: "/dashboard/stands", car: "/dashboard/car", tool: "/dashboard/tools",
  gamepass: "/dashboard/gamepasses", shazam: "/dashboard/shazam", startbr: "/dashboard/startbr", tag: "/dashboard/tags", emoji: "/dashboard/emojis",
};

export default async function DashLayout({ children }) {
  const user = await getSession();
  if (!user) redirect("/");

  const grants = grantsFor(user.level);
  // Centered top-nav links — only what this rank can reach.
  const links = [{ label: "Overview", href: "/dashboard" }];
  if (grants.length) links.push({ label: "Grants", href: GRANT_HREF[grants[0]] });
  if (canBan(user.level)) links.push({ label: "Moderation", href: "/dashboard/bans" });
  if (canGroup(user.level)) links.push({ label: "Group", href: "/dashboard/group" });
  if (canManageGrants(user.level)) links.push({ label: "Audit", href: "/dashboard/audit" });
  if (canWhitelist(user.level)) links.push({ label: "Settings", href: "/dashboard/settings" });

  return (
    <>
      <Topbar user={user} links={links} />
      <div className="shell">
        <Sidebar user={user} grants={grants} canGroup={canGroup(user.level)} canBan={canBan(user.level)} isCofounderPlus={canWhitelist(user.level)} canPurge={canPurge(user.id)} />
        <main className="main">{children}</main>
      </div>
    </>
  );
}
