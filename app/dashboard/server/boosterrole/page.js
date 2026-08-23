import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "base", label: "Anchor role", type: "role", hint: "New booster roles are placed just under this role, so they slot into your hierarchy neatly." },
  { key: "defaultColor", label: "Default colour (hex)", placeholder: "#5865F2", hint: "Used when a booster claims a role without picking a colour." },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="star" title="Booster Role" subtitle="Give each server booster a personal, self-managed role." />
      <FeatureSettings
        feature="boosterrole"
        title="Booster roles"
        description="When on, boosters can run /boosterrole to claim a personal role and rename or recolour it. The role is removed automatically if they stop boosting."
        fields={FIELDS}
      />
    </div>
  );
}
