---
title: Server tools
description: Starboard, Welcome, Goodbye, Logs, VoiceMaster, Aliases — plus Tickets.
---

# Server tools

The **Server** group holds everyday server features.

## Starboard

Highlight messages that get enough reactions — they're reposted to a starboard channel.

| Field | What it does |
| --- | --- |
| **Starboard channel** | Where popular messages land. |
| **Emoji** | The reaction to count (default ⭐; custom emoji supported). |
| **Required reactions** | Threshold to feature a message. |
| **Allow self-starring** | Whether the author's own reaction counts. |

## Welcome

Greet new members. Pick a **channel**, a **message** (placeholders: `{user.mention}`, `{user.name}`,
`{user.display_name}`, `{user.tag}`, `{guild.name}`, `{guild.count}`), and whether to **send as an
embed**.

## Goodbye

Post when a member leaves — same shape as Welcome (channel, message, embed).

## Logs

Send server events to a **log channel**, with per-event toggles: member **joins**, **leaves**,
deleted messages, edited messages. Message logs need the Message Content intent.

## VoiceMaster

Temporary, member-owned voice channels. Joining the **Join-to-Create** channel spins up a personal
channel (deleted when empty); the owner gets Manage/Move perms on it. Needs *Manage Channels* +
*Move Members*.

| Field | What it does |
| --- | --- |
| **Join-to-Create channel** | The trigger voice channel. |
| **Category** | Optional, where temp channels are created. |
| **Channel name** | Template, e.g. `{user.name}'s channel`. |
| **User limit** | 0 = unlimited. |
| **Bitrate** | kbps (8–384). |

## Aliases

Custom command aliases — **on the roadmap** for community servers; the page is present but not yet
active.

## Tickets

Private support tickets that save a transcript on close — see the **[Tickets](tickets.md)** deep dive.
