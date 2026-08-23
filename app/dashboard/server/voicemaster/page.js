import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "j2c", label: "Join-to-Create channel", type: "voice", hint: "When someone joins this voice channel, the bot makes them a personal temp channel and moves them in." },
  { key: "category", label: "Category (optional)", type: "category" },
  { key: "name", label: "Channel name", placeholder: "{user.name}'s channel", hint: "Variables: {user.name} · {user.display_name}" },
  { key: "limit", label: "User limit (0 = unlimited)", numeric: true, placeholder: "0" },
  { key: "bitrate", label: "Bitrate kbps (8–384)", numeric: true, placeholder: "64" },
];

export default featurePage({
  feature: "voicemaster",
  icon: "activity",
  title: "VoiceMaster",
  subtitle: "Temporary voice channels members create by joining. Off until enabled.",
  description: "Joining the Join-to-Create channel spins up a personal voice channel (deleted when empty). The owner gets Manage/Move perms on their channel. Bot needs Manage Channels + Move Members.",
  fields: FIELDS,
});
