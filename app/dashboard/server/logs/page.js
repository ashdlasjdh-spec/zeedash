import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Log channel", type: "channel" },
  { key: "joins", label: "Log member joins", type: "bool" },
  { key: "leaves", label: "Log member leaves", type: "bool" },
  { key: "deletes", label: "Log deleted messages", type: "bool" },
  { key: "edits", label: "Log edited messages", type: "bool" },
];

export default featurePage({
  feature: "logging",
  icon: "list",
  title: "Logs",
  settingsTitle: "Server logging",
  subtitle: "Send server events to a log channel. Off until enabled.",
  description: "Chosen events are posted to the log channel. Message logs need the Message Content intent.",
  fields: FIELDS,
});
