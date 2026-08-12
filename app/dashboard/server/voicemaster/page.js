import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "j2c", label: "Join-to-Create channel", type: "voice", hint: "When someone joins this voice channel, the bot makes them a personal temp channel and moves them in." },
  { key: "category", label: "Category (optional)", type: "category" },
  { key: "name", label: "Channel name", placeholder: "{user.name}'s channel", hint: "Variables: {user.name} · {user.display_name}" },
  { key: "limit", label: "User limit (0 = unlimited)", numeric: true, placeholder: "0" },
  { key: "bitrate", label: "Bitrate kbps (8–384)", numeric: true, placeholder: "64" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="activity" title="VoiceMaster" subtitle="Temporary voice channels members create by joining. Off until enabled." />
      <FeatureSettings feature="voicemaster" title="VoiceMaster" description="Joining the Join-to-Create channel spins up a personal voice channel (deleted when empty). The owner gets Manage/Move perms on their channel. Bot needs Manage Channels + Move Members." fields={FIELDS} />
    </div>
  );
}
