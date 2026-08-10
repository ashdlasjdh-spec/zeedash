import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { redirect } from "next/navigation";
import BundleManager from "../../components/BundleManager";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canConfig(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <h1 className="page-h">Grant Bundles</h1>
      <p className="page-sub">Co owners+. Define a named set of perks (e.g. "VIP") and apply the whole set to a player in one click.</p>
      <BundleManager />
    </div>
  );
}
