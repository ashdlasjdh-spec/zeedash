# zhd.lol — Zee [MACRO!] Dashboard

Staff control panel: Discord OAuth login, **perms driven by your Discord roles** (same source
of truth as your bot), live grants into the game (powers, stands, tools, perks, crew tags,
emojis), and **Roblox group management** (rank changes + kick). Co-founder+ can swap the Open
Cloud key / universe / group ID from the UI.

## Perms come from Discord (bot parity)
A user's dashboard role is resolved in this order:
1. `BOOTSTRAP_OWNER_IDS` — always owner (break-glass).
2. **Discord roles** — their guild roles are mapped to a dashboard role via `DISCORD_ROLE_MAP`.
   Point this at the **same role IDs your bot uses for perms** and the two stay in lockstep.
3. `whitelist` DB table — optional per-user override/promotion.

`DISCORD_ROLE_MAP` example (env, JSON):
```
{"111111111111":"owner","222222222222":"cofounder","333333333333":"admin","444444444444":"staff"}
```
Reading roles needs a bot in your server + `DISCORD_BOT_TOKEN` (Server Members Intent on) and
Your guild is preset to `1531917648588312677`. If you'd rather not use a bot token, just manage people in the Whitelist page.

## Roles
| role | perks/tags/emojis | tools/powers/stands | group (rank/kick) | whitelist + config |
|------|:--:|:--:|:--:|:--:|
| staff | ✓ | | | |
| admin | ✓ | ✓ | ✓ | |
| cofounder | ✓ | ✓ | ✓ | ✓ |
| owner | ✓ | ✓ | ✓ | ✓ |

Edit `lib/permissions.js` to change any of this.

## Group management
The **Group** page looks up a member, changes their rank, or kicks them.
- **Rank change** — works via Open Cloud (your API key needs the `group:write` scope).
- **Kick** — uses the legacy group API with a **cookie** (`ROBLOX_GROUP_COOKIE`, server env only —
  never in the DB/browser/logs). Use a **dedicated alt account** whose only group power is member
  management; a `.ROBLOSECURITY` cookie is full account access. The bot account needs "Manage members".
Set the group id in **Settings** (defaults to `ROBLOX_GROUP_ID`).

## Shared database (same as your bot)
The dashboard writes to the **exact stores your bot uses**, so grants are unified:
- **Powers / stands** -> MessagingService -> `GrantAdminPower` -> the `AdminPowers` datastore (same store as the bot's `DiscordAdminPowerGrantV1`). Every power is grantable, including Shazam (Admin.Powers), Flash, Magic, SVJ/ACT4, GreenLantern, Fly and the flame powers.
- **Gamepasses / tools / armor** (Katana, Armor, Mask, AimLock, Aimviewer, Spawn items) -> `DiscordAdminGrantV1` (your bot's native gamepass topic) -> in-game grant + re-apply on join.
- **Crew tags** -> the perks-api -> shared `crew_tags` table.
- **Emojis** -> the `CustomEmojis` datastore (same as the bot's emojis.js).
Point `DATABASE_URL` at the same Postgres and `PERKS_API_URL` at the same perks-api the bot uses.

## How grants reach the game
```
powers/stands/tools ─► MessagingService "DashboardGrant" ─► DashboardGrantHandler
perks               ─► MessagingService "PerkGrant"      ─► GearServer/MainServerModule
emojis              ─► DataStore "CustomEmojis"          ─► CustomEmojiLoader
crew tags           ─► DataStore "CrewTagDefs"           ─► CrewTagLoader
group rank/kick     ─► Open Cloud Groups API (cloud/v2)
```

## Environment (pre-filled from your bot)
`.env.example` already has every **non-secret** value filled in from your bot's config:
guild `1531917648588312677`, universe `10631060249`, group `1099600954`, and the exact grant
topics (`DiscordAdminPowerGrantV1` / `DiscordAdminGrantV1` + their remove topics). Copy it to
`.env.local` and fill only these:

| var | where to get it |
|-----|-----------------|
| `DISCORD_CLIENT_ID` | your bot's `CLIENT_ID` (same Discord app) |
| `DISCORD_CLIENT_SECRET` | **new** — Discord dev portal → OAuth2 → Client Secret (the bot uses a token; OAuth login needs this) |
| `DISCORD_BOT_TOKEN` | your bot's `DISCORD_TOKEN` (reads member roles) |
| `DISCORD_ROLE_MAP` | **send me your role IDs** and I'll fill it — maps Discord roles → dashboard roles |
| `SESSION_SECRET` | **new** — any long random string |
| `BOOTSTRAP_OWNER_IDS` | your Discord user id (always owner) |
| `ROBLOX_API_KEY` | your bot's `ROBLOX_OPENCLOUD_KEY` |
| `ROBLOX_GROUP_COOKIE` | your bot's `ROBLOX_COOKIE` (only for group kick) |
| `DATABASE_URL` | your Postgres (same one the bot/perks-api uses) |
| `PERKS_API_URL` / `PERKS_API_SECRET` | your perks-api (only used for crew tags → shared `crew_tags` table) |

I could NOT auto-fill the secrets: they live in your bot's runtime `.env`, not in the code I
have (config.js only reads them). So they never leave your own environment — good.

## What I still need from you
1. **Your Discord role IDs** (which role = owner / cofounder / admin / staff) — paste them and I'll
   bake `DISCORD_ROLE_MAP` in so login perms match your server exactly.
2. Confirm crew tags should go to the perks-api `crew_tags` table (they do now). If your game reads
   tags from the `CrewTagDefs` datastore instead, tell me and I'll point the tag route there.
3. If you want **Star Platinum / Soft & Wet** stands grantable, how they're given in-game.

## Setup

## Setup
1. **Discord app** (OAuth2) → redirect `https://zhd.lol/api/auth/callback`. Add a bot to your
   server for role reading (token + guild id + Server Members Intent).
2. **Postgres** → run `schema.sql`.
3. Copy `.env.example` → `.env.local`, fill it. Put your Discord id in `BOOTSTRAP_OWNER_IDS`.
   Fill `DISCORD_ROLE_MAP` with your bot's perm role IDs.
4. `npm install && npm run dev` (or deploy to Vercel, point `zhd.lol` at it).
5. Log in → **Settings** → paste your Open Cloud key (scopes: messaging-service + datastore +
   group). Co-founders can swap key/universe/group here anytime.

## Powers are fully wired
Power/stand grants route through the game's OWN system: `MSModule.GrantAdminPower(userId, key)`
(and `RemoveAdminPower`), which validates against `ADMIN_POWER_NAMES`, persists to the
`AdminPowers` datastore, applies immediately, and **re-applies on every join**. So the catalog's
power keys (ACT4, Batman, SpiderMan, Venom, `_EveryPower`, …) work end-to-end with no per-power
code. The two StandsHandler stands (`WonderOfU`, `D4C`) fall through to a local grant store.
All perk/tag/emoji pipelines are wired too.

<!-- zhd -->
