import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Channel", type: "channel" },
  { key: "message", label: "Message (optional)", type: "textarea", rows: 2, placeholder: "{user.mention} welcome — grab roles in #roles!", hint: "Blank = just ping them. Variables: {user.mention} · {user.name} · {guild.name} · {guild.count}" },
  { key: "delete", label: "Delete the ping after a few seconds", type: "bool" },
];

export default featurePage({
  feature: "pingonjoin",
  icon: "users",
  title: "Ping on Join",
  settingsTitle: "Ping on join",
  subtitle: "Ping new members in a channel. Off until enabled.",
  description: "Pings each new member in the chosen channel.",
  fields: FIELDS,
});
