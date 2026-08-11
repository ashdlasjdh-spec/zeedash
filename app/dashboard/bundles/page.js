import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { redirect } from "next/navigation";
import BundleManager from "../../components/BundleManager";
import PageHeader from "../../components/PageHeader";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canConfig(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="box" title="Grant Bundles" subtitle={'Co owners+. Define a named set of perks (e.g. "VIP") and apply the whole set to a player in one click.'} />
      <BundleManager />
    </div>
  );
}
