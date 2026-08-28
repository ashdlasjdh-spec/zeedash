import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel", type: "channel" },
  { key: "message", label: "Sticky message", type: "textarea", rows: 3, placeholder: "Read the rules before posting!" },
];

export default featurePage({
  feature: "sticky",
  icon: "flag",
  title: "Sticky Message",
  settingsTitle: "Sticky message",
  subtitle: "Keep a message pinned to the bottom of a channel. Off until enabled.",
  description: "Re-posted to the bottom of the channel as people chat (bot needs Manage Messages).",
  fields: FIELDS,
});
