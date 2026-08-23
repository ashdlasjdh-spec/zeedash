import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

export default featurePage({
  feature: "timers",
  icon: "clock",
  title: "Timers",
  subtitle: "Recurring scheduled messages.",
  description: "When on, staff run /timer add to post a message to a channel on a repeating interval (e.g. every 6h). Manage them with /timer list and /timer remove. Timers are restart-safe.",
  fields: [],
});
