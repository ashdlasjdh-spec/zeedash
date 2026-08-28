# zeedash — zhd.lol dashboard

Next.js (App Router) staff control panel for Zee Hood: Roblox perk grants, moderation,
Role Access, the public landing/docs, the self-bot control page, and the game-site editor.

## Commands
- `npm run build` — production build. **Run before every commit** (catches most issues).
- `npm test` — smoke tests (`node --test test/smoke.test.mjs`).
- `npm run e2e` — Playwright (Chromium at `/opt/pw-browsers/chromium`; don't run `playwright install`).
- `npm run dev` — local dev.

## Architecture
- `middleware.js` — per-request **nonce CSP** on documents; CSRF Origin check + write rate-limit on cookie-authed API mutations; **sliding session refresh** (re-issues aged cookies).
- `lib/session.js` — HS256 JWT session (3-day TTL, slid in middleware). Permission **level is resolved live** every request (Discord roles + DB), not trusted from the token. `liveGuildGrants` resolves Role Access / fake-perms / section grants (90s cache + global `bumpGrantsVersion()` bust). `revokeAllSessions()` is a global kill-switch (off by default).
- `lib/permissions.js` — levels, labels, section grants, `isSuperOwner`.
- `lib/db.js` — Postgres (`query`, `ensureSchema`); audit log is hash-chained. `config` table holds `bot_commands`, `game_site`, etc.
- `app/api/*` — route handlers. Bot-facing routes use Bearer `CRON_SECRET` (`guardBot`); never leak `err.message` to clients (log server-side, return generic).
- `app/dashboard/*` — auth-gated pages (`force-dynamic`). `app/dashboard/loading.js` is the shared skeleton.
- `app/dashboard/game-site` + `app/api/game-config` — edit zeehood.org content; served publicly + cached, consumed by the game site. On save it pings `GAME_SITE_REVALIDATE_URL` for instant propagation.
- `app/changelog` + `lib/changelog.mjs` — public "what's new" feed (GitHub commits, cleaned like the bot changelog); also surfaced as a "What's new" card on the dashboard home. Optional `GITHUB_TOKEN` raises the API limit.
- Error tracking: `lib/errorReporter.mjs` → Discord webhook (`ERROR_WEBHOOK_URL`); `app/error.js`/`global-error.js` report via `app/api/client-error`. Deduped + rate-limited; no-ops when unset.

## Deploy
Branch `claude/new-session-<id>` → commit → push → `git checkout main && git merge --ff-only && git push origin main` → back to branch. Env: `SESSION_SECRET` (16+ chars, required in prod), `DATABASE_URL`, `DISCORD_CLIENT_ID`/`SECRET`, `CRON_SECRET`.

## Conventions
- Theme-aware, mobile-friendly (off-canvas drawer < 860px; tables scroll in `.table-wrap`).
- Sidebar nav lives in `app/components/Sidebar.js` (`NAV` array + flag-based gating; `needOwner` = super-owner only).
