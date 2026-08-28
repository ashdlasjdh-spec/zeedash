import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Starboard channel", type: "channel" },
  { key: "emoji", label: "Emoji", placeholder: "", hint: "The reaction to count. Default. Custom emoji: paste it or its ID." },
  { key: "threshold", label: "Required reactions", numeric: true, placeholder: "3" },
  { key: "selfstar", label: "Allow self-starring", type: "bool" },
];

export default featurePage({
  feature: "starboard",
  icon: "star",
  title: "Starboard",
  subtitle: "Highlight messages that get enough reactions. Off until enabled.",
  description: "Messages reaching the reaction threshold are reposted to the starboard channel.",
  fields: FIELDS,
});
