---
title: Settings (Server portal)
description: Core per-server bot settings — General mod-log, Customize identity, AutoPFP, Restrict and Disable.
---

# Settings

The **Settings** group holds the core per-server configuration. Every feature is off until you enable
it.

## General

One field: a **Mod-log channel**. Antinuke, Automod, Antiraid and Honeypot post what they did to this
channel. Leave the feature off to keep them silent.

## Customize

Give the bot a per-server identity — as far as Discord allows:

| Field | What it sets |
| --- | --- |
| **Bot nickname** | The bot's name in this server's member list (max 32 chars). **Apply nickname** pushes it now; it also re-applies on reconnect. Needs *Change Nickname*. |
| **Name on posted messages** | Overrides the name on messages the bot **posts** here (via webhook, so it can differ per server). |
| **Avatar on posted messages** | A per-server avatar (image URL) for **posted** messages. Needs *Manage Webhooks* in the channel. |

!!! note

    Discord doesn't let a shared bot have a per-server **member-profile** avatar or username — those
    are global to the bot application. Only the nickname and the *posted-message* name/avatar are
    per-server.

## AutoPFP

Rotating the bot's avatar isn't possible for a shared bot (one global avatar for every server), so
this feature is **inert** — it's shown for completeness but does nothing.

## Restrict

Limit specific bot commands to specific channels. Add a row per **command + allowed channel**; a
command with any rows can only be used in the listed channel(s). Bot owners bypass. Commands covered:
`makeembed`, `editembed`, `buttonpanel`, `sendembed`, `ticketpanel`, `antinuke`.

## Disable

Turn specific bot commands **off** in this server. Anyone (except a bot owner) who runs a listed
command is refused. Same command set as Restrict.
