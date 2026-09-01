---
title: Role Access
description: Delegate Roblox group management, dashboard sections and transcript viewing to a Discord role.
---

# Role Access

**Role Access** (super-owner only, at `/bot/role-access` and from the dashboard home) delegates
Game-portal capabilities to a **Discord role**. Anyone holding that role gets the access automatically
— no whitelist entry, no rank change. The same rules gate the nav **and** the API, so a grant is
enforced end to end.

## Roblox group actions

Pick any subset of group actions for the role, plus a **ceiling** — the highest rank it may assign
people to (so a delegated manager can rank up to, say, Admin, but never to Co-Owner).

Actions: **Look up members · Set rank · Promote · Demote · Accept requests · Decline requests ·
Kick / exile · Post group shout · Accept ALL · Decline ALL.**

Scoped variants limit a role to a single staff track:

- **Leaderboard** — accept + rank / kick Leaderboard Staff.
- **Crew** — accept + rank / kick Crew.
- **Stars** — accept + rank / kick Stars.
- **Content** — accept + rank / kick Content and Content Staff.

Scoped accepts assign that track's **fixed** rank, so they aren't bound by the ceiling; only
variable-target actions (set rank, promote, accept, accept-all) are.

## Dashboard section grants

Open a whole game-management area to the role:

| Grant | Unlocks |
| --- | --- |
| **Bans & moderation** | The [Moderation](moderation.md) tools. |
| **Powers granting** | The Powers page only. |
| **All granting** | Every grant category (powers, stands, tools, gamepasses, tags, emojis…). |

## Transcript viewing

Grant a role the ability to **view ticket transcripts** for specific guilds. At view time, the
per-ticket "roles that could see the channel" check still applies.
