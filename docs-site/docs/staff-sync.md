---
title: Staff Sync
description: Keep the Roblox staff group and Discord staff roles in agreement, with guarded auto-removal.
---

# Staff Sync — the Roblox group ↔ Discord sync

Staff Sync keeps the Roblox staff group and the Discord staff roles in agreement: when someone loses
their staff role in Discord, their linked Roblox account is removed from the group — and the other
way round it can flag people who are in the group but shouldn't be. It runs from the **Self-bot**
page in the panel, which is gated to **super owners** plus any Discord ID a super owner has
whitelisted for viewing.

!!! warning "Terms-of-service risk"

    Staff Sync uses a Roblox user account, which is against Discord's and Roblox's terms of service
    and can get that account limited. The build paces every action, randomizes delays, and caps mass
    actions to stay well under the rate limits — but nothing makes it 100% safe. Keep it opt-in,
    don't hammer it, and prefer a real bot account wherever you can.

## What it does on its own

<div class="grid cards" markdown>

- ⚡ __Instant role-loss kicks__

    ---

    The moment a staffer loses their Discord staff role, their linked Roblox account is removed from
    the group.

- 🛡️ __Reconcile backstop__

    ---

    A steady sweep re-reads everyone's roles from Discord and removes anyone who slipped through, so
    it converges even if a live event is missed.

- 📋 __Audit watcher__

    ---

    Watches the group's audit log and surfaces removals in the activity feed — a live view of what's
    happening in the group.

- ⚙️ __Staff-info index__

    ---

    Continuously indexes the staff-info channel so it always knows which Roblox account belongs to
    which staffer.

</div>

## Multi-server coverage

Staff live across three servers, and Staff Sync watches all of them. Each server has its own
staff-info channel and its own set of staff roles, and each is reconciled independently — losing
your last staff role in any one of the three removes your linked account from the group
(rank-guarded, as always).

| Server | Reads its own | Reconcile |
| --- | --- | --- |
| Main | Staff-info channel + staff roles | Active — kick on last-role loss |
| Leaderboard | Its own channel + its own staff roles | Active once its staff roles are set |
| Content | Its own channel + its own staff roles | Active once its staff roles are set (read-only until then) |

- **Main bot preferred** — every server is read through the main bot first; it has the real member
  intent, so its role data is fast and reliable.
- **Self-bot fallback** — only where the main bot isn't in a server (or a read fails) does the
  self-bot account step in, so coverage never has a gap.
- **Unknown is never a kick** — if neither bot can read a member, that person's state is left
  untouched. An unreadable member is never removed.

!!! success

    The self-bot page shows a live coverage strip — one pill per watched server — telling you which
    bot is reading each one (main, self-bot fallback, or no coverage). The Roster and person Lookup
    both tag which server each staffer belongs to.

## The optional triggers

Everything below is off by default. Turn a trigger on, hit Save, and it applies within seconds.

| Toggle | What it does |
| --- | --- |
| Kick when a staff role is removed | The core sync — remove the linked Roblox account when the Discord staff role is lost. |
| Kick new joiners with no staff info | Remove someone who is accepted into the group but has no staff-info record (an un-vetted join). |
| Auto orphan cleanup | On a schedule, remove anyone on a removable rank in the group who has no staff-info record. Interval is configurable. |
| Sweep on every startup | After each restart (once the full index rebuilds), run one orphan cleanup. Same guards as the scheduled sweep. |
| Dry run | Log every action it would take without removing anyone — the safe way to preview before going live. |

## The safety net

Every removal — manual, scheduled or automatic — passes the same guards:

<div class="grid cards" markdown>

- 🛡️ __Whitelists__ — protect specific Roblox accounts (by id or name) or whole Discord users; they're never removed.
- 🔑 __Rank guard__ — only ranks you mark removable can be touched; higher ranks are left alone unless you explicitly widen it.
- 📋 __Full-index rule__ — the orphan cleanup refuses to run unless the whole staff-info channel indexed, so a registered staffer is never mistaken for an orphan.
- ⚡ __Capped + paced__ — mass actions are capped per run and spaced out, so a mistake can't cascade into a group wipe.

</div>

!!! success

    Always press **Dry-run preview** before enabling anything that removes people. It shows exactly
    who would be affected without touching the group.

## Doing things by hand

1. **Look up a person** — search a Discord or Roblox id to see their linked accounts, group rank,
   and whether they'd be removed.
2. **Preview or sync now** — run a one-off audit sweep or a dry-run preview at any time from Quick
   actions.
3. **Reindex staff** — force a rebuild of the staff-info index if you just added a batch of
   staffers.
4. **Orphan cleanup** — preview, then purge, group members with no staff record — or let the
   scheduled sweep do it for you.

## Health at a glance

The status strip shows whether it's connected, how many staff records it holds, and when each sweep
last ran (*Last reconcile*, and *Last orphan sweep* when scheduled cleanup is on) — turning red if a
sweep goes stale, so you can tell at a glance it's alive and working.
