import { featurePage } from "@/app/components/featurePage";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "roles", label: "Roles", type: "roles", hint: "Given to every member on join. Bot needs Manage Roles, with its top role above these." },
];

export default featurePage({
  feature: "autorole",
  icon: "users",
  title: "Autorole",
  subtitle: "Automatically assign roles when a member joins. Off until enabled.",
  description: "Roles added to every new member.",
  fields: FIELDS,
});
