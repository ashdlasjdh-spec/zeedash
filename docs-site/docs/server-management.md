---
title: Server management
description: Configure the Zee Hood Discord bot per server — moderation, automation, roles, logging and more.
---

# Server management

The Server portal configures the Zee-hood Discord bot for a specific server. Pick a guild from the
top of the sidebar and every page below configures the bot *for that server* — moderation,
automation, roles, logging, welcomes and more.

## Picking a server

At the top of the Server sidebar is the server picker. Whatever guild is selected there is the one
every feature page reads and writes. The sidebar only shows the servers you can manage, and within
a server it only shows the features your role unlocks.

!!! info

    Changes save per server and take effect immediately — the bot reads the same settings store the
    panel writes to, so there's no deploy or restart step.

## How a feature page works

Most features follow the same shape: a master on/off toggle, then the settings for that feature.
Flip it on, fill in the fields, and it saves. The Overview page summarises what's enabled at a
glance.

Placeholders like `{user}`, `{user.name}`, `{server}` and `{count}` are filled in per member when
the bot posts. The bot's embeds are brand-styled automatically — a clean, branded embed with the
new member's avatar.

## Every feature

The Server portal groups its features the same way the sidebar does.

=== "Settings"

    | Feature | What it does |
    | --- | --- |
    | General | Core per-server settings — prefix and base configuration. |
    | Customize | Branding for the bot's embeds and responses in this server. |
    | AutoPFP | Automatic profile-picture handling. |
    | Restrict | Limit who can run which commands. |
    | Disable | Turn individual commands off in this server. |

=== "Security"

    | Feature | What it does |
    | --- | --- |
    | Fake Permissions | Grant command access via roles without real Discord permissions. |
    | Automod | Rules that auto-moderate messages (spam, links, words). |
    | Antiraid | Detect and stop coordinated join raids. |
    | Antinuke | Guard against mass-delete / mass-ban nuke attempts. |
    | Honeypot | Trap channels that catch and action bad actors. |

    Deep dive: **[Security features](security.md)**.

=== "Automation"

    | Feature | What it does |
    | --- | --- |
    | Autoresponder | Reply automatically to trigger phrases. |
    | Autoreact | Add reactions to matching messages automatically. |
    | Autorole | Assign roles to members on join. |
    | Ping on Join | Ping a channel or role when someone joins. |
    | Tracking | Track member and message activity. |

    Deep dive: **[Automation & roles](automation.md)**.

=== "Utility"

    | Feature | What it does |
    | --- | --- |
    | Bump Reminder | Remind the server to bump on Disboard. |
    | Button Roles | Self-assign roles from buttons. |
    | Reaction Roles | Self-assign roles from reactions. |
    | Levels | XP and leveling with a public leaderboard. |
    | Sticky Message | Keep a message pinned to the bottom of a channel. |

=== "Server"

    | Feature | What it does |
    | --- | --- |
    | Starboard | Highlight popular messages in a starboard channel. |
    | Welcome | Greet new members with a message or embed. |
    | Goodbye | Post when a member leaves. |
    | Aliases | Custom command aliases. |
    | Logs | Log edits, deletes, joins, leaves and mod actions. |
    | VoiceMaster | Temporary, member-owned voice channels. |
    | Tickets | A support-ticket system. |

!!! warning

    **Antinuke** and **Antiraid** only appear for the server owner or its antinuke admins — they're
    hidden from everyone else, even other staff.

## Message Builder & Leaderboard

Two standalone tools sit above the groups. The **Message Builder** composes rich embed messages for
the bot to post — titles, fields, colours and buttons — with a live preview. The **Leaderboard**
shows the server's XP rankings driven by the [Levels](levels.md) feature.

1. **Open the Server portal** — switch to Server in the sidebar and pick your guild in the server
   picker.
2. **Choose a feature** — navigate the grouped sidebar: Settings, Security, Automation, Utility,
   Server.
3. **Toggle & configure** — flip the master switch on, set the fields, and save. It applies to the
   bot right away.
4. **Confirm on Overview** — the Overview page lists what's enabled so you can see the whole
   server's setup at once.
