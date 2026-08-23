import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";
import PublishPanel from "../../../components/PublishPanel";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "nick", label: "Bot nickname in this server", placeholder: "Zee Hood", hint: "The bot's name in the member list here (max 32 chars). Click Apply below to set it now — it also applies whenever the bot joins/reconnects. Bot needs Change Nickname." },
  { key: "postName", label: "Name on the bot's posted messages", placeholder: "Zee Hood", hint: "Overrides the name shown on messages the bot POSTS here (Message Builder) — sent via a webhook so it can differ per server." },
  { key: "postAvatar", label: "Avatar on the bot's posted messages (image URL)", mono: true, placeholder: "https://…/avatar.png", hint: "A per-server avatar for the bot's POSTED messages. Bot needs Manage Webhooks in the channel." },
];

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="gear" title="Customize" subtitle="Give the bot a per-server identity — as far as Discord allows." />
      <div className="card" style={{ maxWidth: 720, marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
          Discord doesn&apos;t let a shared bot have a different <b>member-profile avatar or username</b> per server —
          those are global to the bot application, and nothing (sharding included) changes that. What you <b>can</b> set
          per server: the bot&apos;s <b>nickname</b> in the member list, and a custom <b>name + avatar on the messages it
          posts</b> (via a webhook). Configure both below.
        </p>
      </div>
      <FeatureSettings
        feature="customize"
        title="Per-server identity"
        description="Turn on, set a nickname and/or a posting name + avatar, then Save. Use Apply nickname below to push the nickname to Discord now."
        fields={FIELDS}
      />
      <PublishPanel kind="setnick" title="Apply the nickname" label="Apply nickname" hint="Sets the bot's nickname in this server right now (otherwise it applies next time the bot reconnects)." />
    </div>
  );
}
