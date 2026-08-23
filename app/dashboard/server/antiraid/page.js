import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "ageEnabled", label: "Block new accounts", type: "bool" },
  { key: "ageDays", label: "Minimum account age (days)", numeric: true, placeholder: "7" },
  { key: "ageAction", label: "Action for new accounts", type: "select", options: ["kick", "ban"] },
  { key: "avatarEnabled", label: "Block accounts with no avatar", type: "bool" },
  { key: "avatarAction", label: "Action for no-avatar", type: "select", options: ["kick", "ban"] },
  { key: "massEnabled", label: "Mass-join (raid) protection", type: "bool" },
  { key: "massThreshold", label: "Joins within 10s to trigger", numeric: true, placeholder: "8" },
  { key: "massAction", label: "Action during a raid", type: "select", options: ["ban", "kick"] },
];

export default featurePage({
  feature: "antiraid",
  icon: "shield",
  title: "Join Gate / Antiraid",
  subtitle: "Auto-remove suspicious joins. Off until enabled — this kicks/bans, so configure carefully.",
  description: "Screens new members by account age, missing avatar, and mass-join rate. Bot needs Kick/Ban Members. Bots and admins are never actioned.",
  fields: FIELDS,
});
