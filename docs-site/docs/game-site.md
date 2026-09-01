---
title: Game Site editor
description: Edit the public zeehood.org marketing site from the panel — no code, no redeploy.
---

# Editing the game site (zeehood.org)

The public marketing site at **zeehood.org** is edited entirely from the panel — no code, no
redeploy. The **Game&nbsp;Site** page owns the live player stats, the announcement banner, the store
lists, and every link the site shows.

## Where it lives

Open **zhd.lol → Game&nbsp;Site** in the sidebar (it's a super-owner page). Change any field, hit
**Save**, and the change is pushed straight to zeehood.org.

!!! info

    Only super owners see the Game&nbsp;Site page — it edits a public website, so it's kept to the
    top of the ladder. Everything else in the panel is unaffected.

## What you can change

| Field | What it controls |
| --- | --- |
| Hero title | The big headline at the top of the landing page. |
| Tagline | The one-line subtitle under the title. |
| Announcement | An optional banner across the top — leave it empty to hide it. |
| Game link | The "Play" button target (the Roblox game URL). |
| Place ID | The Roblox place the site reads live players, visits and screenshots from. |
| Discord link | The "Join Discord" button target. |
| Live stats | Toggle the live player-count / visits bar on or off. |
| Buy label + note | The wording on the purchase buttons and the note beside them. |
| Socials | Extra link rows shown in the footer (label + URL). |
| Gamepasses / Powers / Roles / Shop | The store lists shown on each section page — name and price rows. |

## How a save reaches the site

1. **You save** — the panel writes the change to the shared config the whole ecosystem reads.
2. **It publishes** — zeehood.org fetches that config (cached ~60s) and a save also pings the site
   to refresh immediately, so changes show within seconds.
3. **It always renders** — if a list is ever empty or the fetch fails, the site falls back to its
   built-in defaults — it never shows a blank page.

!!! success

    Editing a role, power or shop item also updates its little preview on the landing page
    automatically — the home-page teasers are derived from the same lists.

## Good to know

<div class="grid cards" markdown>

- ⚡ __Live numbers are automatic__

    ---

    Player count, visits and in-game screenshots come straight from Roblox using the Place ID — you
    don't enter them by hand.

- 🛡️ __Safe to experiment__

    ---

    There's a built-in fallback for every field, so a bad or blank value can't take the site down.

- ⚙️ __One source of truth__

    ---

    The same config powers the site and the panel, so what you see when editing is what visitors
    get.

</div>
