import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "modBan", label: "Watch bans", type: "bool" },
  { key: "modKick", label: "Watch kicks", type: "bool" },
  { key: "modChannel", label: "Watch channel create / delete", type: "bool" },
  { key: "modRole", label: "Watch role create / delete", type: "bool" },
  { key: "modWebhook", label: "Watch webhook creation", type: "bool" },
  { key: "modEmoji", label: "Watch emoji deletion", type: "bool" },
  { key: "modBotadd", label: "Watch bot additions", type: "bool" },
  { key: "threshold", label: "Actions allowed before punishing (1–6)", numeric: true, placeholder: "3" },
  { key: "window", label: "Time window (seconds)", numeric: true, placeholder: "30" },
  { key: "punishment", label: "Punishment", type: "select", options: ["strip", "jail", "kick", "ban"], hint: "strip = remove all their roles (never bans) · jail = strip + 24h timeout · kick · ban" },
  { key: "whitelist", label: "Trusted user IDs (bypass)", type: "textarea", rows: 2, mono: true, placeholder: "111111111111111111  222222222222222222" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="shield" title="Antinuke" subtitle="Limit what mods can destroy. Off until enabled — punishes staff, so whitelist trusted people." />
      <FeatureSettings feature="antinuke" title="Antinuke" description="Watches the audit log: if a non-whitelisted member exceeds the threshold of destructive actions in the window, they're punished. The server owner and the bot are always exempt. Bot needs View Audit Log + the punishment permission (Manage Roles / Kick / Ban), and its role above the offenders'." fields={FIELDS} />
    </div>
  );
}
