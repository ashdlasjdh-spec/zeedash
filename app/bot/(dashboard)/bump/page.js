import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "channel", label: "Reminder channel (blank = where it was bumped)", type: "channel" },
  { key: "role", label: "Role to ping (optional)", type: "role", hint: "The bot watches for Disboard's /bump success, then reminds here 2 hours later." },
];

export default featurePage({
  feature: "bump",
  icon: "clock",
  title: "Bump Reminder",
  settingsTitle: "Bump reminder",
  subtitle: "Remind the server to /bump on Disboard. Off until enabled.",
  description: "After a successful Disboard bump, the bot reminds you (optionally pinging a role) once the 2-hour cooldown is up.",
  fields: FIELDS,
});
