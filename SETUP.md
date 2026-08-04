# zhd.lol — Staff Dashboard (setup)

The web dashboard at **zhd.lol**. Everything the bot can grant, in a browser, gated by
**Discord login + a numeric permission level (0–255)** that mirrors the bot exactly.

Part of the [Zee Hood system](../SETUP.md) — read that first for how the pieces connect.

## What it does
- **Discord OAuth login**; access + capabilities decided by the member's highest Discord role.
- **Grants**: powers, stands, SVJ car, tools, gamepasses (with "currently granted" lookups).
- **Crew tags**: multi-color gradient, **PNG icon upload** (uploaded to Roblox as a decal),
  edit + delete — publishes into the game via Open Cloud.
- **Custom emojis** above a player's name.
- **Group management**: rank / promote / demote / kick, join-request accept/decline (+ bulk),
  group shout.
- **Whitelist** (manually grant someone a level) and **Settings** (swap the Open Cloud key /
  universe / group id at runtime).
- **Audit log** — every action is written to Postgres **and** mirrored to a Discord log channel.

## Prerequisites
- The **same** Discord app, Open Cloud key, Postgres DB, and `PERKS_API_SECRET` as the bot.
- A Vercel project with the domain **zhd.lol**.

## Environment variables
Copy `.env.example` → `.env.local` (local) or set them in Vercel → Settings → Environment
Variables. `.env.local` is git-ignored; **never commit real values**.

| Var | Required | What |
|---|---|---|
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | ✅ | OAuth2 app credentials. |
| `DISCORD_REDIRECT_URI` | ✅ | `https://zhd.lol/api/auth/callback`. |
| `DISCORD_GUILD_ID` | ✅ | Your server id (to read member roles). |
| `DISCORD_BOT_TOKEN` | ✅ | Bot token — reads roles **and** posts the action log. |
| `DISCORD_ROLE_MAP` | ✅ | JSON `{ "<roleId>": <level 0-255> }`. **Mirror the bot's levels.** |
| `DISCORD_LOG_CHANNEL_ID` | ➖ | Channel actions are mirrored to (defaults to `1533027437145882684`). |
| `SESSION_SECRET` | ✅ | Long random string that signs the login cookie. |
| `BOOTSTRAP_OWNER_IDS` | ➖ | Break-glass Discord ids that always get in (level 255). |
| `ROBLOX_API_KEY` | ✅ | Open Cloud key (DataStore + Messaging + Assets). |
| `ROBLOX_CREATOR_ID` | ✅* | Roblox user id that **owns the API key** (`11080769482`). *Required for PNG icon upload.* |
| `ROBLOX_UNIVERSE_ID` | ✅ | `10631060249`. |
| `ROBLOX_GROUP_ID` | ✅ | `1099600954`. |
| `ROBLOX_GROUP_COOKIE` | ✅* | `.ROBLOSECURITY` for group kicks / join-requests. |
| `DATABASE_URL` | ✅ | Same Postgres as the perks-api (whitelist/config/audit tables auto-create). |
| `PERKS_API_URL` / `PERKS_API_SECRET` | ✅ | Perks-api base URL + shared secret (crew-tag + perk mirror). |
| `POWER_GRANT_TOPIC`, `ADMIN_GRANT_TOPIC`, … | ➖ | MessagingService topic overrides — leave default. |

## Permission levels
`lib/permissions.js` defines the thresholds; `DISCORD_ROLE_MAP` supplies each role's level.
247+ = grant perks · 254+ (co founders) = crew tags + emojis · 242+ = group management ·
248+ = bulk group ops · 251+ = whitelist/settings. **A rank change applies live** (within
~15s) — no re-login needed.

## Run locally
```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
```

## Deploy (Vercel)
1. Import the repo. **Framework Preset must be `Next.js`** (there's a `vercel.json` that sets it).
2. Add every env var above (Production + Preview).
3. Add the domain **zhd.lol** under Project → Domains; point DNS (apex A record + `www` CNAME).
4. Deploy. Route handlers are `force-dynamic`, so no build-time DB access is required.

> **Gotchas:** `ROBLOX_CREATOR_ID` **must equal the account that generated the API key** or
> icon upload 403s. If you change `DISCORD_ROLE_MAP`, redeploy — it's read at request time,
> and the numeric-level format must match this code version.
