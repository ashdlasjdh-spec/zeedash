---
title: Access & roles
description: The rank ladder, super owners, whitelist, blacklist, and the three ways access is granted.
---

# Access & roles

Who can do what on zhd.lol is decided by **three independent systems** that stack on top of each
other. Most staff only ever touch the first one.

1. **The rank ladder** — a numeric **level** (0–255) that gates the whole **Game portal** (grants,
   crew tags, bans, Roblox group management, whitelist, settings).
2. **Per-server standing** — for the **Server portal** (the Discord bot), access comes *only* from
   your standing in each Discord server, never from the ladder.
3. **Role Access** — a super owner can delegate specific Game-portal capabilities (group actions,
   whole sections, transcript viewing) to a Discord **role**.

Above all three sit a small, hard-coded list of **super owners** who can do everything.

## The rank ladder (levels)

Your level is the **highest** level among your Discord roles, mapped by `DISCORD_ROLE_MAP`
(`<discordRoleId>` → `0–255`). The exact same map drives the bot, so the panel and the bot whitelist
identically.

The capability thresholds are (from `lib/permissions.js`):

| Capability | Level needed | Rank |
| --- | --- | --- |
| Ban / unban / kick a player (single) | **238** | mod+ |
| Bulk bans (pasted lists) | **251** | co owners+ |
| Grant **gamepasses** | **247** | staff advisor+ |
| Grant **powers, stands, SVJ car, tools, Shazam, Start&nbsp;BR** | **251** | co owners+ |
| Grant **crew tags & emojis** | **254** | co founders+ |
| Roblox **group** management (rank / kick / accept / shout…) | **242** | head of staff+ (plus host 234 & content-creator-manager 235) |
| Bulk group ops (accept-all / decline-all) | **248** | overseer+ |
| Whitelist staff, Blacklist, Settings, Bundles | **254** | co founders+ |
| Load "who has this" lists & remove others' grants | **254** | co founders+ |

!!! warning "The old docs were wrong here"

    Grants are **not** all gated at co-founders. Gamepasses are staff&nbsp;advisor+ (247), the main
    perks (powers/stands/car/tools/Shazam/Start&nbsp;BR) are **co&nbsp;owners+ (251)**, and only crew
    tags & emojis are co&nbsp;founders+ (254). Single bans are **mod (238)**, not 237.

### The full rank list

Levels map to these rank names (highest first). This is the ladder the whitelist dropdown and the
sidebar role pill use.

| Level | Rank | | Level | Rank |
| --- | --- | --- | --- | --- |
| 255 | founders | | 240 | admin |
| 254 | co founders | | 239 | head mod |
| 253 | owners | | 238 | mod |
| 252 | right hand man | | 237 | helpers |
| 251 | co owners | | 236 | leaderboard staff |
| 249 | director | | 235 | content creator manager |
| 248 | overseer | | 234 | host |
| 247 | staff advisor | | 14–10 | chat-mod tiers |
| 246 | head management | | 5 | verified pc checker |
| 245 | management | | 1 | staff |
| 244 | server manager | | 0 | no access |
| 243 | owner assistant | | | |
| 242 | head of staff | | | |
| 241 | senior admin | | | |

## Super owners

A handful of Discord IDs are **super owners**, wired into the code (mirrors the bot's `FULL_OWNERS`).
They bypass every check — top level (255), every grant, all group access, full management of every
server they're in *including the security features*, plus the super-owner-only pages (Game Site,
Role Access). The list isn't editable from the UI; an engineer extends it via `SUPER_OWNER_IDS`.

A separate **purge-owner** list gates the destructive **Remove All** page (see
[Moderation](moderation.md)); by default it's the same IDs, extendable via `PURGE_OWNER_IDS`.

## The staff whitelist

The **Whitelist** page (co founders+) is the source of truth for who is staff and at what level, for
anyone whose Discord roles don't already place them on the ladder.

- Add a **Discord user ID**, pick a **level** — you can only assign a level **at or below your own** —
  and optionally a note.
- The table lists each entry with its rank pill, note, and who added it. **Remove** revokes their
  access on their next request.

## The blacklist

The **Blacklist** page (co founders+) blocks a Discord user from the dashboard **entirely** — they
can't sign in or use any page, regardless of their roles. Paste their Discord user ID with an
optional note; **Unblock** restores access.

## Server-portal access (per Discord server)

The **Server portal** ignores the rank ladder completely. For each guild, you get in one of three
ways:

- **Discord admin / owner** of that guild → manage every non-security feature.
- A **manual ("fake") permission** held through a role → manage only the feature(s) it unlocks
  (`administrator` is the master key). Configured on the [Fake Permissions](security.md) page.
- The **guild owner or a listed antinuke admin** → the security features (Antinuke / Antiraid),
  which are locked tighter than everything else — never a plain admin, never a manual perm.

A director in the main server with no standing in another server doesn't see that other server at
all. The sidebar only shows the servers, and the features, you can actually manage.

## Role Access (delegation)

A super owner can grant a **Discord role** extra Game-portal power on the **Role Access** page
(super-owner only). Members with that role get the access automatically. It can delegate:

- **Roblox group actions** — any subset of look-up, set rank, promote, demote, accept, decline, kick,
  shout, accept-all, decline-all — plus a ceiling on the **highest rank** the role may assign people
  to. Scoped variants exist for single staff tracks (Crew, Leaderboard, Stars, Content).
- **Whole dashboard sections** — Bans & moderation, Powers granting, or All granting.
- **Ticket-transcript viewing** for specific guilds.

See [Role Access](role-access.md) for the full breakdown.
