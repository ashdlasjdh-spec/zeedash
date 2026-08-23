import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel", type: "channel" },
  { key: "message", label: "Message", type: "textarea", rows: 3, placeholder: "Welcome {user.mention} to {guild.name}! You're member #{guild.count}.", hint: "Variables: {user.mention} · {user.name} · {user.display_name} · {user.tag} · {guild.name} · {guild.count}" },
  { key: "embed", label: "Send as an embed", type: "bool" },
];

export default featurePage({
  feature: "welcome",
  icon: "users",
  title: "Welcome",
  settingsTitle: "Welcome message",
  subtitle: "Greet new members when they join. Off until you enable it.",
  description: "Posted to the chosen channel whenever someone joins this server.",
  fields: FIELDS,
});
