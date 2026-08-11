import { getSession } from "@/lib/session";
import { grantsFor, canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import TempGrants from "../../components/TempGrants";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!grantsFor(u.level).length && !canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <h1 className="page-h">Temporary grants</h1>
      <p className="page-sub">Every grant with a countdown timer. The bot auto-revokes each one when it expires — here you can see what&apos;s pending, revoke early, or extend the clock.</p>
      <TempGrants />
    </div>
  );
}
