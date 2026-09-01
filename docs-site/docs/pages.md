---
title: Every page
description: A complete tour of the control panel — every page, grouped by portal, with a line on how it works.
---

# Every page

A complete tour of the control panel — every page, grouped by portal, with a line on how it works.
Many pages share one interface; where they do, it's shown once and the pages that use it are listed.

## Game portal

The Game portal hands out everything a player can have in the Roblox game. The seven grant pages all
share **one interface** — pick an item, enter a player, choose permanent or timed, and grant. Only
the item list changes from page to page.

| Page | Route | Grants |
| --- | --- | --- |
| Powers | `/dashboard/powers` | Abilities |
| Stands | `/dashboard/stands` | Stands |
| Cars | `/dashboard/car` | Vehicles (SVJ, …) |
| Tools | `/dashboard/tools` | In-game tools |
| Gamepasses | `/dashboard/gamepasses` | Passes |
| Shazam | `/dashboard/shazam` | The Shazam perk |
| Start BR | `/dashboard/startbr` | Battle-Royale start permission |

Three more Game-portal pages have their own interfaces:

| Page | Route | What it does |
| --- | --- | --- |
| Bundles | `/dashboard/bundles` | Build and grant named item bundles. |
| Temp Grants | `/dashboard/temp-grants` | Live list of timed grants counting down — see [Game control](game-control.md). |
| Crew Tags | `/dashboard/tags` | Custom name tags — full [Crew tags](crew-tags.md) deep dive. |
| Emojis | `/dashboard/emojis` | Player emoji badges — full [Emojis](emojis.md) deep dive. |

## Moderation

Enforcement and history tools. Each has its own page:

| Page | Route | What it does |
| --- | --- | --- |
| Bans | `/dashboard/bans` | Ban/warn/kick/unban with live target resolution — see [Moderation](moderation.md). |
| Blacklist | `/dashboard/blacklist` | A standing list of players barred from the game. |
| Lookup | `/dashboard/lookup` | Resolve a player and pull up their perks + ban history. |
| Audit | `/dashboard/audit` | The full, searchable record of staff actions. |
| Analytics | `/dashboard/analytics` | Ban trends and player activity charts. |
| Purge | `/dashboard/purge` | Owner-only bulk data wipes (break-glass). |

!!! warning

    **Purge** is locked to dedicated purge owners and performs irreversible wipes — it's deliberately
    separate from everyday moderation.

## Server portal

The Server portal configures the Discord bot for the selected server. Three pages stand on their
own; the rest are feature pages that all share one **toggle-and-configure** layout.

- **Overview** (`/bot`) — a live summary of what's enabled for the selected server.
- **Message Builder** (`/bot/message-builder`) — compose a rich embed with a live preview, then have
  the bot post it.
- **Leaderboard** (`/bot/leaderboard`) — the server's XP rankings from the [Levels](levels.md)
  feature.

### Feature pages — one pattern, many features

Every feature page works the same way: a master on/off toggle, then that feature's settings. Learn
it once and you know them all.

| Group | Feature pages |
| --- | --- |
| Settings | General · Customize · AutoPFP · Restrict · Disable |
| Security | Fake Permissions · Automod · Antiraid · Antinuke · Honeypot — [deep dive](security.md) |
| Automation | Autoresponder · Autoreact · Autorole · Ping on Join · Tracking — [deep dive](automation.md) |
| Utility | Bump Reminder · Button Roles · Levels · Reaction Roles · Sticky Message |
| Server | Starboard · Welcome · Goodbye · Aliases · Logs · VoiceMaster · Tickets |

## Public & account pages

| Page | Route | What it does |
| --- | --- | --- |
| Front page | `/` | The public landing with live community stats. |
| Catalog | `/catalog` | Browse every grantable item. |
| My perks | `/perks` | A player checks what they own. |
| Preview | `/preview` | See a crew tag or emoji before it goes live. |
| Status | `/status` | Live service status. |
| Settings | `/dashboard/settings` | Your account + backup/restore of server settings. |
| Game Site | `/dashboard/game-site` | Edit the public zeehood.org site — see [Game Site editor](game-site.md). |
| Self-bot | `/dashboard/selfbot` | Control the Roblox group sync — see [Staff Sync](staff-sync.md). |
| Login | `/login` | The Discord sign-in card for staff. |

!!! success

    That's every page in the panel. For the mechanics behind specific features, jump to the deep
    dives — [crew tags](crew-tags.md), [the game site editor](game-site.md),
    [Staff Sync](staff-sync.md), [security](security.md), [automation](automation.md) and more.
