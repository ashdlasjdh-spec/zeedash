---
title: Config & keys
description: Open Cloud config, ban-log keys, integrations, the DB→game sync, and settings backup.
---

# Config & keys

The **Settings** page (senior leadership; some keys gated higher) holds the Open&nbsp;Cloud config and
the bot's integration keys. Overrides are stored in the shared database and take effect **immediately —
no redeploy**.

## Open Cloud & IDs

| Field | Notes |
| --- | --- |
| **Open Cloud API key** | The key grants reach the game with. Write-only — shows a masked hint, never the value. |
| **Universe ID** | The Roblox universe the grants/tags are written to. |
| **Group ID** | The managed Roblox group. |

Each field shows where its current value comes from (dashboard override vs. env).

## Ban-log delivery

- **Bans API key** (co&nbsp;founders+) — an Open&nbsp;Cloud key with the *User Restrictions* scope; falls
  back to the main key if unset.
- **Ban-log bot token + channel** (super owners) — post ban logs **as the bot** (supports large
  evidence clips).
- **Ban-log webhook** (fallback) — used only when no bot token is set.

## Sync database → game

The shared Postgres DB is the universe-independent source of truth. After you **swap games / change
the universe ID**, the new universe's DataStores are empty — **Sync DB to game** writes every perk
grant (powers, gamepasses, tools, Shazam, armor) back into the `PlayerPerks` store, rebuilds the power
whitelists, and re-publishes every crew tag. Online players are pinged; everyone else re-applies on
next spawn.

## Integrations & API keys

The **Integrations** panel (co&nbsp;founders+) holds global keys for the bot's external features (AI,
Last.fm, Fortnite, music, Spotify, media, social feeds). A value set here overrides the bot's own
environment within about a minute. Secrets are write-only — paste a new value to replace one.

## Settings backup (per server)

For the Server portal, you can **export** a server's whole feature config to a JSON file and
**import** it onto another server to clone it. Import is gated per feature — only features you can
manage in the target server are written; the rest are skipped.
