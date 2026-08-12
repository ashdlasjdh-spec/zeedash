import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const ACTIONS = [
  { value: "ban", label: "Bans" },
  { value: "kick", label: "Kicks" },
  { value: "channel", label: "Channel create / delete" },
  { value: "role", label: "Role create / delete" },
  { value: "webhook", label: "Webhook creation" },
  { value: "emoji", label: "Emoji deletion" },
  { value: "botadd", label: "Bot additions" },
];

const FIELDS = [
  { key: "actions", label: "Watched actions — set the limit for each", type: "list", addLabel: "Watch an action", cols: [
    { key: "action", label: "Action", type: "select", options: ACTIONS, flex: 1.5 },
    { key: "threshold", label: "Max allowed (1–6)", placeholder: "3", flex: 0.8 },
  ] },
  { key: "window", label: "Time window (seconds)", numeric: true, placeholder: "30" },
  { key: "punishment", label: "Punishment", type: "select", options: ["strip", "jail", "kick", "ban"], hint: "strip = remove all their roles (never bans) · jail = strip + 24h timeout · kick · ban" },
  { key: "whitelist", label: "Whitelisted user IDs (never actioned)", type: "textarea", rows: 2, mono: true, placeholder: "111111111111111111  222222222222222222", hint: "In-server, the owner manages this with /antinuke whitelist @user (owner-only)." },
  { key: "admins", label: "Antinuke admin IDs (exempt + trusted)", type: "textarea", rows: 2, mono: true, placeholder: "111111111111111111  222222222222222222", hint: "Or /antinuke admin @user in the server (owner-only)." },
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
