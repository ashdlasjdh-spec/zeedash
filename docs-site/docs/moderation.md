---
title: Moderation
description: Ban, warn, kick and unban players, keep a blacklist, look up history, and audit every action.
---

# Moderation

The moderation tools cover in-game enforcement: banning, warning and kicking players, keeping a
blacklist, looking up someone's history, and reviewing every staff action in the audit log.

## Tools at a glance

<div class="grid cards" markdown>

- 🚫 __Bans__ — ban, warn, kick or unban a player, with a reason and optional duration + evidence.
- 📋 __Blacklist__ — a standing list of players barred from the game.
- 🔍 __Lookup__ — resolve a Roblox user and pull up their perks, bans and history.
- 🕓 __Audit log__ — every grant, ban and config change: who did what, when.
- 📈 __Analytics__ — ban trends and player activity over time.
- 🗑️ __Purge__ — owner-only bulk data wipes, kept well away from everyday actions.

</div>

## Banning a player

The Bans page resolves the target as you type, so you can confirm you have the right person before
you act. Bans can be permanent or timed, always carry a reason, and can include evidence. The list
of active bans updates on its own as bans land from the game, the bot, or another moderator.

| Action | Effect | Reason required |
| --- | --- | --- |
| **Ban** | Removes the player and blocks re-entry, permanently or for a set time. | Yes |
| **Warn** | Logs a formal warning against the player without removing them. | Yes |
| **Kick** | Boots the player from the current session. | No |
| **Unban** | Lifts an active ban — also available inline on each ban row. | No |

!!! info

    Bans need **Mod (237+)**. **Bulk bans** — pasting many players at once — are reserved for
    **Leadership (251+)**.

## Warning escalation & appeals

Warnings can escalate on their own: set a threshold with `,warnconfig <count> [alert|ban]` and once
a player hits it (and each multiple after) the bot either pings staff to review or auto-bans them
from the game. Banned players who've linked their Roblox account can submit an appeal with
`,appeal <reason>`; it posts to the review channel you set with `,appealchannel`, where **Accept**
lifts their ban in-game and DMs them the outcome.

## Looking someone up

The Lookup page takes a Roblox username or ID and pulls together everything the system knows about
them: their resolved profile, the perks they currently hold, and their ban history. It's the
fastest way to answer "what does this player have, and have they been in trouble before?"

1. **Enter a username or ID** — the panel resolves it to a Roblox profile and avatar.
2. **Review their perks** — see every power, stand, car and pass currently granted to them.
3. **Check their history** — past and active bans and warnings, with reasons and dates.
4. **Act from there** — jump straight to granting, revoking, or banning from what you find.

## The audit log

Nothing happens silently. Every grant, revoke, ban, warn, kick and config change is written to the
audit log with the staff member, the target, the action, and a timestamp. It's searchable and
colour-coded by action, so accountability is built in rather than bolted on.

!!! warning

    The **Purge** page performs irreversible bulk data wipes and is locked to a dedicated list of
    purge owners — separate from, and stricter than, normal staff levels. Treat it as a break-glass
    tool.
