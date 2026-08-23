import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel", type: "channel" },
  { key: "message", label: "Message", type: "textarea", rows: 3, placeholder: "{user.name} left {guild.name}. We're now {guild.count} members.", hint: "Variables: {user.name} · {user.display_name} · {user.tag} · {guild.name} · {guild.count}" },
  { key: "embed", label: "Send as an embed", type: "bool" },
];

export default featurePage({
  feature: "goodbye",
  icon: "users",
  title: "Goodbye",
  settingsTitle: "Goodbye message",
  subtitle: "Post a message when a member leaves. Off until you enable it.",
  description: "Posted to the chosen channel whenever someone leaves this server.",
  fields: FIELDS,
});
