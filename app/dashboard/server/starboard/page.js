import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Starboard channel ID", mono: true, placeholder: "123456789012345678" },
  { key: "emoji", label: "Emoji", placeholder: "⭐", hint: "The reaction to count. Default ⭐. Custom emoji: paste it or its ID." },
  { key: "threshold", label: "Required reactions", numeric: true, placeholder: "3" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="star" title="Starboard" subtitle="Highlight messages that get enough reactions. Off until enabled." />
      <FeatureSettings feature="starboard" title="Starboard" description="Messages reaching the reaction threshold are reposted to the starboard channel." fields={FIELDS} />
    </div>
  );
}
