---
title: Access & roles
description: The rank ladder, super owners, the staff whitelist, and exactly what each level unlocks.
---

# Access & roles

One number decides everything you can do on the panel: your **level**. It comes from the staff
whitelist, and every page and API route checks it before doing anything.

## The rank ladder

Higher levels unlock more. The ladder runs from staff (level&nbsp;1) up to founders (255), with a
separate band for chat-moderation roles. A handful of hard-coded **super owners** sit above the
ladder entirely and bypass every check.

| Band | Example levels | What it unlocks |
| --- | --- | --- |
| **Super owner** | Above the ladder | Everything, always — wired into code, not the whitelist. |
| **Founders / leadership** | 251 – 255 | Bulk bans, full server config, everything below. |
| **Co-founders** | 254 | Manage grants, whitelist staff, crew tags & emojis. |
| **Admin** | 240 | Full moderation, plus everything staff can do. |
| **Mod** | 237 | Ban / warn / kick. |
| **Staff** | 1 | Sign in, view, and use non-destructive tools. |

*Levels are additive — a higher rank keeps everything the ranks below it can do.*

!!! warning

    **Super owners** are wired into both the panel and the bot in code, so they always have full
    control even if the whitelist is wrong. That list is deliberately tiny and only an engineer can
    change it — it isn't editable from the UI.

## What the levels gate

These are the main capability thresholds the panel enforces:

| Capability | Needs | Where |
| --- | --- | --- |
| Ban / warn / kick | Mod (237+) | [Bans](moderation.md) |
| Bulk bans | Leadership (251+) | Bans → bulk |
| Manage grants | Co-founders (254) | [Game portal](game-control.md) |
| Whitelist staff | Co-founders (254) | Whitelist |
| Crew tags & emojis | Co-founders (254) | Tags · Emojis |
| Full server config | Leadership (251+) | [Server portal](server-management.md) |
| Purge / wipe data | Purge owners only | Purge |
| Everything, always | Super owner | All pages |

## The staff whitelist

The whitelist is the source of truth for who is staff and at what level. You add a Discord user
ID, pick a level (you can only assign at or below your own), and optionally leave a note. Removing
someone revokes their panel access immediately.

1. **Get the Discord ID** — turn on Developer Mode in Discord, right-click the user, and Copy User
   ID.
2. **Add & pick a level** — paste the ID, choose a level at or below your own, add a note if
   useful, and hit **Add / update**.
3. **They can sign in** — the next time they open zhd.lol and log in with Discord, they're matched
   to that level.
4. **Remove to revoke** — hitting **Remove** drops them from the whitelist and they lose panel
   access on their next request.

!!! success

    Access is also enforced **per Discord server** for the Server portal. Even a whitelisted staffer
    only sees the bot features they can actually manage in that specific guild — the sidebar hides
    the rest.

## Per-server access

The Server portal layers Discord's own permissions on top of your panel level. Security features
like **Antinuke** and **Antiraid** only appear for a guild's owner or its designated antinuke
admins. Staff with manual per-feature permissions see exactly the features they were granted and
nothing else. The panel shows you what you can touch; the server enforces it again on every save.
