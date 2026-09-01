---
title: Server management
description: Configure the Zee Hood Discord bot per server — how the portal, feature pages and access work.
---

# Server management

The **Server portal** configures the Zee&nbsp;Hood Discord bot for a specific server. Pick a guild at
the top of the sidebar and every page below configures the bot **for that server**.

Access here comes **only** from your standing in each Discord server (a Discord admin/owner, a manual
"fake" permission, or antinuke-admin for the security features) — the Roblox rank ladder grants none.
See [Access & roles](access.md).

## Picking a server

The server picker at the top of the Server sidebar chooses the guild every feature page reads and
writes. The sidebar only lists servers you can manage, and within a server only the features your
standing unlocks.

!!! info

    Changes save **per server** and take effect immediately — the bot reads the same settings store
    the panel writes to, so there's no deploy or restart.

## How a feature page works

Most features share one pattern: a **master on/off toggle**, then that feature's fields. Flip it on,
fill the fields, **Save**. The **Overview** (`/bot`) summarises what's enabled at a glance, and
**Get Started** (`/bot/onboarding`) is a guided checklist that ticks off as you configure things.

Message templates support placeholders filled in per member — `{user.mention}`, `{user.name}`,
`{user.display_name}`, `{user.tag}`, `{guild.name}`, `{guild.count}` (and `{level.new_rank}` on
level-ups). Channel/role fields are dropdowns populated from the live guild.

## The feature groups

The sidebar (and this documentation) groups features exactly as the product does:

<div class="grid cards" markdown>

- ⚙️ __Settings__ — [General, Customize, AutoPFP, Restrict, Disable](server-settings.md)
- 🛡️ __Security__ — [Fake Permissions, Automod, Antiraid, Antinuke, Honeypot](security.md)
- 🤖 __Automation__ — [Autoresponder, Autoreact, Autorole, Ping on Join, Tracking](automation.md)
- 🧰 __Utility__ — [Message Builder, Embeds, Bump, Button/Reaction Roles, Levels, Sticky](utility.md)
- 🗂️ __Server__ — [Starboard, Welcome, Goodbye, Logs, VoiceMaster, Tickets…](server-tools.md)
- 🎉 __Economy & Fun__ — [Economy, Booster Role, Giveaways, Counters, Timers](economy.md)

</div>

Two standalone tools sit above the groups: the **Message Builder** and **Embeds** manager (compose
and post embeds — see [Utility](utility.md)), and the **Leaderboard** (top members by messages, voice
hours and reactions).

## What isn't offered (and why)

The panel is honest about limits a shared bot can't get around:

- **AutoPFP** — a shared bot has one global avatar; Discord doesn't allow a per-server avatar, so this
  is inert.
- **Customize** — you *can* set a per-server **nickname** and a **posting name + avatar** (via
  webhook) for messages the bot posts; you **can't** change its global member-profile avatar/username.
- **Tracking** and **Aliases** are on the roadmap and do nothing yet.
