import Link from "next/link";
import { Figure, Callout, SpecTable, Pager, Icon } from "../_components";
import { MiniFlow } from "../_diagrams2";

export const metadata = { title: "Security features · zhd.lol docs" };

export default function SecurityDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="shield" size={13} /> &nbsp;Deep dive</span>
      <h1>Security features</h1>
      <p className="docs-lede">
        The security suite protects a server automatically — filtering messages, stopping raids, blocking
        nukes, and catching bad actors. Each one is a toggle-and-configure feature; here&apos;s how each
        actually works.
      </p>

      <Callout kind="warn">
        <strong>Antinuke</strong> and <strong>Antiraid</strong> are the most powerful settings, so they only
        appear for the server owner or its antinuke admins — never plain staff.
      </Callout>

      <h2>Automod</h2>
      <p>
        Automod inspects every message against the rules you enable — spam, invite links, banned words,
        mass mentions, and more — and takes the action you set when one matches.
      </p>
      <Figure url="automod — per message" caption={<><b>Every message is checked.</b> A clean message passes untouched; a match is actioned instantly.</>}>
        <MiniFlow items={["Message posted", { t: "Rule check", s: "spam · links · words" }, { t: "Action", s: "delete · warn · timeout" }]} />
      </Figure>

      <h2>Antiraid</h2>
      <p>
        Antiraid watches the <em>rate</em> of joins. When a burst looks coordinated — many accounts joining
        at once, often brand-new — it locks the server down: new joins are held, verified, or removed until
        the wave passes.
      </p>
      <Figure url="antiraid — join burst" caption={<><b>Rate, not one account.</b> Normal joins are ignored; a spike trips the lockdown.</>}>
        <MiniFlow items={[{ t: "Join burst", s: "many at once" }, { t: "Raid detected", s: "threshold hit" }, { t: "Lockdown", s: "hold / verify / remove" }]} />
      </Figure>

      <h2>Antinuke</h2>
      <p>
        Antinuke guards against a compromised or rogue moderator doing catastrophic damage. Dangerous
        actions — mass bans, mass channel/role deletes — by anyone who isn&apos;t a whitelisted admin are
        blocked, and the actor is stripped and punished.
      </p>
      <Figure url="antinuke — dangerous action" caption={<><b>Damage control.</b> A non-whitelisted mass action is reverted and the actor is dealt with.</>}>
        <MiniFlow items={[{ t: "Mass ban / delete", s: "by non-admin" }, { t: "Blocked", s: "action reverted" }, { t: "Actor punished", s: "roles stripped" }]} />
      </Figure>

      <h2>Honeypot</h2>
      <p>
        A honeypot is a hidden trap channel that legitimate members never post in. Anyone (or any
        self-bot) that does is flagged and auto-actioned — a cheap, reliable way to catch spammers.
      </p>
      <Figure url="honeypot — trap channel" caption={<><b>Bait and catch.</b> Posting in the trap is proof enough to action.</>}>
        <MiniFlow items={[{ t: "Hidden trap channel" }, { t: "Someone posts", s: "shouldn’t happen" }, { t: "Auto-action", s: "ban / kick" }]} />
      </Figure>

      <h2>Fake Permissions</h2>
      <p>
        Fake permissions let you grant command access through a role <em>without</em> giving that role real
        Discord permissions. The bot maps roles to virtual permissions and checks them itself, so you can
        hand out bot powers without handing out Discord powers.
      </p>
      <Figure url="fake permissions — command check" caption={<><b>Bot powers without Discord powers.</b> The bot resolves your virtual permissions, not Discord&apos;s.</>}>
        <MiniFlow items={[{ t: "Member runs command" }, { t: "Role → virtual perms", s: "bot’s own map" }, { t: "Allowed", s: "no real perms needed" }]} />
      </Figure>

      <SpecTable
        head={["Feature", "Trigger", "Response"]}
        rows={[
          ["Automod", "A message matching a rule", "Delete / warn / timeout"],
          ["Antiraid", "A burst of joins", "Lockdown / verify / remove"],
          ["Antinuke", "Mass destructive action by a non-admin", "Block + strip the actor"],
          ["Honeypot", "A post in the trap channel", "Auto ban / kick"],
          ["Fake Permissions", "A command run by a mapped role", "Allow without real Discord perms"],
        ]}
      />

      <Pager prev={{ href: "/docs/stats", title: "Stats pipeline" }} next={{ href: "/docs/automation", title: "Automation & roles" }} />
    </>
  );
}
