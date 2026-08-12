import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";

export const dynamic = "force-dynamic";

// The Discord permission equivalents bleed's fake-permissions maps to.
const PERMS = [
  { value: "administrator", label: "Administrator" },
  { value: "ban_members", label: "Ban members" },
  { value: "kick_members", label: "Kick members" },
  { value: "moderate_members", label: "Timeout members" },
  { value: "manage_messages", label: "Manage messages" },
  { value: "manage_roles", label: "Manage roles" },
  { value: "manage_nicknames", label: "Manage nicknames" },
];

const COLS = [
  { key: "role", label: "Role", type: "role", flex: 1 },
  { key: "perms", label: "Fake permissions", type: "multi", options: PERMS, placeholder: "+ Add permission…", flex: 1.7 },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="shield" title="Fake Permissions" subtitle="Give roles bot-only permissions without real Discord admin. Off until enabled." />
      <FeatureList
        feature="fake-permissions"
        title="Fake permissions"
        description="Map roles to permissions the BOT honours — so a mod can use the bot's tools (e.g. ban via the bot) without holding Discord's real permission, which stops a rogue mod from nuking with native Discord. Right now the bot's admin commands (/makeembed, /buttonpanel, /ticketpanel, …) require the Administrator fake permission. The others are stored and ready for bot moderation commands. Tip: mods → manage_messages + moderate_members + kick_members; admins → + ban_members + manage_roles; co-owners → administrator."
        columns={COLS}
        addLabel="Add role"
      />
    </div>
  );
}
