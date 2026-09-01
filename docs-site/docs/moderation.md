---
title: Moderation
description: Ban and unban players, look up history by player or case ID, blacklist, audit, and the danger zone.
---

# Moderation

In-game enforcement and history: banning players via Open&nbsp;Cloud, looking someone up, the audit
log, and the destructive **Remove All** tools. Single bans need **mod+ (238)**; bulk bans need
**co&nbsp;owners+ (251)**. (Access can also be delegated as a "Bans & moderation" section grant — see
[Role Access](role-access.md).)

## Bans — the Moderation dashboard

The **Bans** page bans or unbans a player from the game via **Open&nbsp;Cloud user restrictions**, and
shows every active ban live. Each action posts a log embed to the ban webhook / bot.

| Field | Notes |
| --- | --- |
| **Roblox username or ID** | Resolved as you type. |
| **Reason** | **Required** to ban. Logged and shown in lookups. |
| **Duration (seconds)** | Blank = **permanent**; otherwise a timed ban. |

- **Ban** applies the restriction and returns a **case ID** (`RD-XXXX-XXXX`).
- **Unban** lifts it.
- **Bulk** mode (co&nbsp;owners+) applies a ban/unban to a pasted list at once.

!!! info "Where ban logs go"

    Ban actions post an embed to a Discord channel. If a **ban-log bot token + channel** is set in
    [Config](config.md), logs post *as the bot* (supporting large evidence clips); otherwise they fall
    back to a **webhook**. Both are configured in Settings.

## Lookup

The **Lookup** page answers "what's this player's history?" — search **by player** (username, ID, or
profile link) or **by case ID**.

It returns:

- A **user card** with avatar, display name, and an **ACTIVE BAN / no active ban** badge.
- A **current snapshot** — restriction, reason, since, duration, latest case ID, recorded-action
  count.
- A **full activity timeline** — every recorded action on the player (grants, bans, warns, kicks…).
- A **moderation history** table — date, action, reason, case, moderator.

## Blacklist

The **Blacklist** page (co&nbsp;founders+) blocks a **Discord** user from the dashboard entirely —
they can't sign in or use any page. Paste their Discord user ID with an optional note; **Unblock**
restores access. (This is dashboard access, distinct from an in-game ban.)

## Audit log

Nothing happens silently. Every grant, revoke, ban, warn, kick and config change is written to the
**Audit Log** (visible to co&nbsp;founders+ / full group access) with the staff member, action,
target, detail and timestamp — searchable and colour-coded per action. It's also surfaced as the
**Recent activity** feed and **Top movers** on the dashboard home.

## Danger zone — Remove All

The **Remove All** page is locked to **purge owners** (a dedicated Discord-ID list, stricter than any
rank). Every action here is irreversible and asks you to type a confirmation word.

<div class="grid cards" markdown>

- 🗑️ __Mass-remove a category__

    ---

    Revoke **every** Powers / Stands / Shazam / SVJ&nbsp;Car / Tools / Gamepasses / Start&nbsp;BR grant
    from every player who has one — in-game, in the datastores, and in the database.

- ↩️ __Revoke everything a granter made__

    ---

    If a staff member abused the dashboard, pull back **every** grant they ever made, matched from the
    audit log by their Discord ID or name.

- 🧨 __Wipe user data__

    ---

    Erase everything tied to one player — powers, perks, emojis, temp grants, and their
    `DashboardWhitelist` + `PlayerPerks` datastore entries. For GDPR-style requests or a full reset.

</div>

!!! danger

    These cannot be undone. Each confirms with a typed word (`WIPE`, `REVOKE`, or the category name)
    before it runs.
