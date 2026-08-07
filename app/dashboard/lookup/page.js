import { getSession } from "@/lib/session";
import { canBan } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Lookup from "../../components/Lookup";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canBan(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <h1 className="page-h">User lookup</h1>
      <p className="page-sub">Search by player or case ID for a full moderation profile — current restriction, reason, and every recorded action.</p>
      <Lookup />
    </div>
  );
}
