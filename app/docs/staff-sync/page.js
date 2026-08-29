import { Callout, Tiles, Steps, SpecTable, Pager, Icon } from "../_components";

export const metadata = { title: "Staff Sync · zhd.lol docs" };

export default function StaffSyncDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="robot" size={13} /> &nbsp;Deep dive</span>
      <h1>Staff Sync — the Roblox group ↔ Discord sync</h1>
      <p className="docs-lede">
        Staff Sync keeps the Roblox staff group and the Discord staff roles in agreement: when someone
        loses their staff role in Discord, their linked Roblox account is removed from the group — and
        the other way round it can flag people who are in the group but shouldn&apos;t be. It runs from
        the <strong>Self-bot</strong> page in the panel.
      </p>

      <Callout kind="warn">
        Staff Sync uses a Roblox user account, which is against Discord&apos;s and Roblox&apos;s terms of
        service and can get that account limited. The build paces every action, randomizes delays, and
        caps mass actions to stay well under the rate limits — but nothing makes it 100% safe. Keep it
        opt-in, don&apos;t hammer it, and prefer a real bot account wherever you can.
      </Callout>

      <h2>What it does on its own</h2>
      <Tiles items={[
        { icon: "bolt", title: "Instant role-loss kicks", body: "The moment a staffer loses their Discord staff role, their linked Roblox account is removed from the group." },
        { icon: "shield", title: "Reconcile backstop", body: "A steady sweep re-reads everyone’s roles from Discord and removes anyone who slipped through, so it converges even if a live event is missed." },
        { icon: "list", title: "Audit watcher", body: "Watches the group’s audit log and surfaces removals in the activity feed — a live view of what’s happening in the group." },
        { icon: "gear", title: "Staff-info index", body: "Continuously indexes the staff-info channel so it always knows which Roblox account belongs to which staffer." },
      ]} />

      <h2>Multi-server coverage</h2>
      <p>
        Staff live across three servers, and Staff Sync watches all of them. Each server has its own
        staff-info channel and its own set of staff roles, and each is reconciled independently — losing
        your last staff role in any one of the three removes your linked account from the group
        (rank-guarded, as always).
      </p>
      <SpecTable
        head={["Server", "Reads its own", "Reconcile"]}
        rows={[
          ["Main", "Staff-info channel + staff roles", "Active — kick on last-role loss"],
          ["Leaderboard", "Its own channel + its own staff roles", "Active once its staff roles are set"],
          ["Content", "Its own channel + its own staff roles", "Active once its staff roles are set (read-only until then)"],
        ]}
      />
      <Tiles items={[
        { icon: "robot", title: "Main bot preferred", body: "Every server is read through the main bot first — it has the real member intent, so its role data is fast and reliable." },
        { icon: "shield", title: "Self-bot fallback", body: "Only where the main bot isn’t in a server (or a read fails) does the self-bot account step in, so coverage never has a gap." },
        { icon: "info", title: "Unknown is never a kick", body: "If neither bot can read a member, that person’s state is left untouched — an unreadable member is never removed." },
      ]} />
      <Callout kind="good">
        The self-bot page shows a live coverage strip — one pill per watched server — telling you which
        bot is reading each one (main, self-bot fallback, or no coverage). The Roster and person Lookup
        both tag which server each staffer belongs to.
      </Callout>

      <h2>The optional triggers</h2>
      <p>Everything below is off by default. Turn a trigger on, hit Save, and it applies within seconds.</p>
      <SpecTable
        head={["Toggle", "What it does"]}
        rows={[
          ["Kick when a staff role is removed", "The core sync — remove the linked Roblox account when the Discord staff role is lost."],
          ["Kick new joiners with no staff info", "Remove someone who is accepted into the group but has no staff-info record (an un-vetted join)."],
          ["Auto orphan cleanup", "On a schedule, remove anyone on a removable rank in the group who has no staff-info record. Interval is configurable."],
          ["Sweep on every startup", "After each restart (once the full index rebuilds), run one orphan cleanup — re-scans the group for members with no staff info and removes them. Same guards as the scheduled sweep."],
          ["Dry run", "Log every action it would take without removing anyone — the safe way to preview before going live."],
        ]}
      />

      <h2>The safety net</h2>
      <p>Every removal — manual, scheduled or automatic — passes the same guards:</p>
      <Tiles items={[
        { icon: "shield", title: "Whitelists", body: "Protect specific Roblox accounts (by id or name) or whole Discord users — they’re never removed." },
        { icon: "key", title: "Rank guard", body: "Only ranks you mark removable can be touched; higher ranks are left alone unless you explicitly widen it." },
        { icon: "list", title: "Full-index rule", body: "The orphan cleanup refuses to run unless the whole staff-info channel indexed, so a registered staffer is never mistaken for an orphan." },
        { icon: "bolt", title: "Capped + paced", body: "Mass actions are capped per run and spaced out, so a mistake can’t cascade into a group wipe." },
      ]} />
      <Callout kind="good">
        Always press <strong>Dry-run preview</strong> before enabling anything that removes people. It shows
        exactly who would be affected without touching the group.
      </Callout>

      <h2>Doing things by hand</h2>
      <Steps items={[
        { title: "Look up a person", body: "Search a Discord or Roblox id to see their linked accounts, group rank, and whether they’d be removed." },
        { title: "Preview or sync now", body: "Run a one-off audit sweep or a dry-run preview at any time from Quick actions." },
        { title: "Reindex staff", body: "Force a rebuild of the staff-info index if you just added a batch of staffers." },
        { title: "Orphan cleanup", body: "Preview, then purge, group members with no staff record — or let the scheduled sweep do it for you." },
      ]} />

      <h2>Health at a glance</h2>
      <p>
        The status strip shows whether it&apos;s connected, how many staff records it holds, and when each
        sweep last ran (<em>Last reconcile</em>, and <em>Last orphan sweep</em> when scheduled cleanup is
        on) — turning red if a sweep goes stale, so you can tell at a glance it&apos;s alive and working.
      </p>

      <Pager prev={{ href: "/docs/game-site", title: "Game Site editor" }} next={{ href: "/docs/security", title: "Security features" }} />
    </>
  );
}
