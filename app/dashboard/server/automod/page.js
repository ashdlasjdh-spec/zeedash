import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "words", label: "Banned words", type: "textarea", rows: 2, placeholder: "word1, word2, phrase three", hint: "Comma/space separated. Case-insensitive; matches anywhere in a message." },
  { key: "invites", label: "Block Discord invites", type: "bool" },
  { key: "links", label: "Block all links", type: "bool" },
  { key: "maxMentions", label: "Max mentions per message (0 = off)", numeric: true, placeholder: "5" },
  { key: "action", label: "Action (delete / timeout / kick / ban)", placeholder: "delete" },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="ban" title="Automod" subtitle="Auto-filter messages. Off until enabled." />
      <FeatureSettings feature="automod" title="Automod" description="Deletes messages that contain banned words, Discord invites, links, or too many mentions — then optionally times out / kicks / bans. Members with Manage Messages are exempt. Needs Manage Messages (+ Moderate/Kick/Ban for those actions) and the Message Content intent." fields={FIELDS} />
    </div>
  );
}
