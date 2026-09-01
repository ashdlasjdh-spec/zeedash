---
title: Automation
description: Autoresponder, Autoreact, Autorole, Ping on Join and Tracking.
---

# Automation

Small, self-contained automations you switch on per server.

## Autoresponder

When a message contains a **trigger** (or exactly matches it), the bot replies with your **response**.
Add as many rules as you like; each row is trigger · response · **Exact** (match the whole message).
Needs the Message Content intent.

## Autoreact

The bot reacts to messages automatically. Each rule is:

- **Trigger word** (optional) — react when a message contains it.
- **Channel ID** (optional) — react to everything in that channel.
- **Emojis** — space-separate multiple.

## Autorole

Roles given to **every** new member on join. Multi-select the roles. The bot needs *Manage Roles*
with its top role above the ones it assigns.

## Ping on Join

Ping each new member in a channel.

| Field | What it does |
| --- | --- |
| **Channel** | Where the ping is posted. |
| **Message** | Optional; blank = just ping them. Supports `{user.mention}`, `{guild.name}`, `{guild.count}`. |
| **Delete after a few seconds** | Auto-remove the ping. |

## Tracking

Username / vanity tracking is **on the roadmap** — the page is present but does nothing yet.

---

Welcome and Goodbye greetings live in the [Server tools](server-tools.md) group; self-assign
**Button Roles** and **Reaction Roles** live in [Utility](utility.md).
