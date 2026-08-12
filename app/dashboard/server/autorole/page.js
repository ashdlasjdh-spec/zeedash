import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "roles", label: "Roles", type: "roles", hint: "Given to every member on join. Bot needs Manage Roles, with its top role above these." },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="users" title="Autorole" subtitle="Automatically assign roles when a member joins. Off until enabled." />
      <FeatureSettings feature="autorole" title="Autorole" description="Roles added to every new member." fields={FIELDS} />
    </div>
  );
}
