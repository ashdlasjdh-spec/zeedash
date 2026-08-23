import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

export default featurePage({
  feature: "giveaways",
  icon: "gift",
  title: "Giveaways",
  subtitle: "Reaction giveaways with automatic winner draws.",
  description: "When on, staff run /giveaway start to launch a 🎉-reaction giveaway (with optional required roles), and /giveaway end, reroll, cancel, list or edit to manage it. Winners are drawn automatically when the timer ends — even across a bot restart.",
  fields: [],
});
