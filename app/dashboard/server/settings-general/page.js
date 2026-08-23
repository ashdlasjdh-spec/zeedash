import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "modlog", label: "Mod-log channel", type: "channel", hint: "Antinuke, Automod, Antiraid and Honeypot post what they did to this channel." },
];

export default featurePage({
  feature: "settings-general",
  icon: "gear",
  title: "General",
  subtitle: "Core server settings. Off until enabled.",
  description: "A mod-log channel where the security features report their actions. Leave the feature off to keep them silent.",
  fields: FIELDS,
});
