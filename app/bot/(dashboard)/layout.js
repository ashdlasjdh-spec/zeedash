import { getSession } from "@/lib/session";
import { grantsForSession, canGroupS, canConfig, canWhitelistS, canBanS, canPurge, canManageGrantsS, canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import Topbar from "@/app/components/Topbar";
import CommandPalette from "@/app/components/CommandPalette";

export const dynamic = "force-dynamic";

const GRANT_HREF = {
  power: "/dashboard/powers", stand: "/dashboard/stands", car: "/dashboard/car", tool: "/dashboard/tools",
  gamepass: "/dashboard/gamepasses", shazam: "/dashboard/shazam", startbr: "/dashboard/startbr", tag: "/dashboard/tags", emoji: "/dashboard/emojis",
};

// Bot dashboard shell (zhd.lol/bot). Same chrome as the game dashboard, but portal = Server; the
// Sidebar detects the /bot path and shows the Server Management nav. Game-only pages are unaffected.
export default async function BotLayout({ children }) {
  const user = await getSession();
  if (!user) redirect("/");
  const serverAccess = canAccessServerSection(user);
  if (!serverAccess) redirect("/dashboard"); // no bot access → back to the game portal (which itself gates)

  const lvl = user.level;
  const grants = grantsForSession(user);
  const scopedGroup = !!user.scopedGroup;
  const groupAny = canGroupS(user) || scopedGroup;

  const links = [{ label: "Bot", href: "/bot" }, { label: "Commands", href: "/bot/commands" }, { label: "Game", href: "/dashboard" }];

  const allGroups = [{ sec: "Bot", items: [{ label: "Overview", href: "/bot" }, { label: "Commands", href: "/bot/commands" }] }];
  if (grants.length) allGroups.push({ sec: "Game", items: [{ label: "Game dashboard", href: "/dashboard" }, { label: "Grants", href: GRANT_HREF[grants[0]] }] });

  const seen = new Set();
  const cmdItems = [];
  for (const g of allGroups) for (const it of g.items) { if (seen.has(it.href)) continue; seen.add(it.href); cmdItems.push({ ...it, group: g.sec }); }

  return (
    <>
      <Topbar user={user} links={links} allGroups={allGroups} canSettings={canWhitelistS(user)} />
      <CommandPalette items={cmdItems} />
      <div className="shell">
        <Sidebar user={user} grants={grants} canGroup={canGroupS(user)} canGroupScoped={scopedGroup} canBan={canBanS(user)} canConfig={canConfig(lvl)} isCofounderPlus={canWhitelistS(user)} canPurge={canPurge(user.id)} gameAccess={!!user.gameAccess} serverAccess={serverAccess} />
        <main className="main">{children}</main>
      </div>
    </>
  );
}
