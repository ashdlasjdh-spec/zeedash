import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Reminder channel ID (blank = where it was bumped)", mono: true, placeholder: "123456789012345678" },
  { key: "role", label: "Role to ping (optional)", mono: true, placeholder: "123456789012345678", hint: "The bot watches for Disboard's /bump success, then reminds here 2 hours later." },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="clock" title="Bump Reminder" subtitle="Remind the server to /bump on Disboard. Off until enabled." />
      <FeatureSettings feature="bump" title="Bump reminder" description="After a successful Disboard bump, the bot reminds you (optionally pinging a role) once the 2-hour cooldown is up." fields={FIELDS} />
    </div>
  );
}
