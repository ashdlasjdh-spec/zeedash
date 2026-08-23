import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";
import { MANUAL_PERMS, MANUAL_PERM_LABELS } from "@/lib/permissions";
import { FEATURE_GROUPS, SECURITY_SLUGS } from "@/lib/serverFeatures";

export const dynamic = "force-dynamic";

// The Discord permission equivalents the fake-permissions feature maps to (from the shared MANUAL_PERMS
// set so the page, the session resolver and the gate never drift).
const PERMS = [...MANUAL_PERMS].map((p) => ({ value: p, label: MANUAL_PERM_LABELS[p] || p }));

// Direct per-feature grants — a role can be given exact dashboard features (e.g. just Tickets + Autorole)
// with no Discord-permission bucket. Security features and fake-permissions itself are never grantable.
const NO_GRANT = new Set([...SECURITY_SLUGS, "fake-permissions"]);
const FEATURES = FEATURE_GROUPS.flatMap((g) => g.items)
  .filter((i) => !NO_GRANT.has(i.slug))
  .map((i) => ({ value: i.slug, label: i.label }));

const COLS = [
  { key: "role", label: "Role", type: "role", flex: 1 },
  { key: "perms", label: "Fake permissions", type: "multi", options: PERMS, placeholder: "+ Add permission…", flex: 1.5 },
  { key: "features", label: "Specific features", type: "multi", options: FEATURES, placeholder: "+ Add feature…", flex: 1.5 },
];

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="shield" title="Fake Permissions" subtitle="Give roles bot-only permissions without real Discord admin, or grant a role exact dashboard features. Off until enabled." />
      <FeatureList
        feature="fake-permissions"
        title="Fake permissions"
        description="Map roles to what they can manage — WITHOUT real Discord admin, so a rogue mod can't nuke with native Discord. Two ways to grant, per role: (1) Fake permissions — a Discord-permission bucket the bot honours (e.g. manage_messages unlocks automod, logs, autoresponders; administrator unlocks everything); (2) Specific features — hand a role the exact dashboard pages it can edit (e.g. just Tickets + Autorole), no bucket needed. A role can use either or both. Server owner, super owners, and antinuke admins can edit this page. Antinuke/Antiraid and this page itself are never grantable here."
        columns={COLS}
        addLabel="Add role"
      />
    </div>
  );
}
