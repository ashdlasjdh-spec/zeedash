---
title: Utility
description: Message Builder, Embeds, Bump Reminder, Button Roles, Reaction Roles, Levels and Sticky Message.
---

# Utility

## Message Builder

Compose an embed on the web and post it straight to a channel — instantly. Titles, description,
colours and fields, with a live preview.

## Embeds

Build embeds, post them to a channel, and **edit the live Discord message in place** later — so you
can fix or update an announcement without deleting and reposting.

## Bump Reminder

The bot watches for Disboard's `/bump` success, then reminds the server once the **2-hour cooldown**
is up.

- **Reminder channel** — blank = wherever it was bumped.
- **Role to ping** — optional.

## Button Roles

Self-assign roles by clicking buttons. Configure a panel, then **Publish** (or run `/buttonpanel`).
Clicking a button toggles the role. Needs *Manage Roles*.

| Field | What it does |
| --- | --- |
| **Channel** | Where the panel is posted. |
| **Panel title / description** | The panel's heading and body. |
| **Buttons** | Each: label · role · **style** (green / blurple / gray / red) · emoji. |

## Reaction Roles

Reacting with the emoji on a message grants the role; removing it takes it away. Add rows of
**message ID · emoji · role**, then **Add the emojis** (or run `/reactionsync`) so the bot seeds each
reaction for members to click. Needs *Manage Roles*.

## Levels

XP and leveling — see the **[Levels & XP](levels.md)** deep dive.

## Sticky Message

Keep a message pinned to the bottom of a channel — the bot re-posts it as people chat. Pick a
**channel** and the **sticky message** text. Needs *Manage Messages*.
