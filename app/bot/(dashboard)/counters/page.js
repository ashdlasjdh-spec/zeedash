import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

export default featurePage({
  feature: "counters",
  icon: "activity",
  title: "Counter Channels",
  settingsTitle: "Counter channels",
  subtitle: "Live channels that display your member, boost and online counts.",
  description: "When on, staff run /counter add to create a voice/text channel whose name shows a live stat (members, humans, bots, boosts, online, roles, channels). It refreshes automatically on joins/leaves and on a timer. Manage them with /counter list and /counter remove.",
  fields: [],
});
