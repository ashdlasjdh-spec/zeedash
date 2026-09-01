---
title: Economy & Fun
description: Economy, Booster Role, Giveaways, Counter Channels and Timers.
---

# Economy & Fun

## Economy

A server currency game. Members earn coins with **daily / work / beg**, **gamble**, **pay** each
other, and **deposit** to a bank, with a **richest-members leaderboard**. Turn it on and tune the
numbers (blank = default):

| Field | Default |
| --- | --- |
| **Currency symbol / name** | shown next to every amount |
| **Daily reward** min / max | 200 / 500 |
| **Work reward** min / max | 80 / 220 |
| **Gamble win chance (%)** | 48 — keep under 50 so the economy doesn't inflate |

## Booster Role

Give each server booster a personal, self-managed role. When on, boosters run `/boosterrole` to claim
a role and rename or recolour it; it's removed automatically if they stop boosting.

- **Anchor role** — new booster roles slot in just under this role.
- **Default colour (hex)** — used when a booster claims without picking one.

Needs *Manage Roles*.

## Giveaways

Reaction giveaways with automatic winner draws. Staff run `/giveaway start` (with optional required
roles) and manage them with `/giveaway end`, `reroll`, `cancel`, `list` or `edit`. Winners are drawn
automatically when the timer ends — **even across a bot restart**.

## Counter Channels

Live channels whose name shows a stat. Staff run `/counter add` to create a voice/text channel
displaying members, humans, bots, boosts, online, roles or channels; it refreshes on joins/leaves and
on a timer. Manage with `/counter list` and `/counter remove`. Needs *Manage Channels*.

## Timers

Recurring scheduled messages. Staff run `/timer add` to post a message to a channel on a repeating
interval (e.g. every 6h); manage with `/timer list` and `/timer remove`. **Restart-safe.**
