---
title: Security
description: Fake Permissions, Automod, Antiraid, Antinuke and Honeypot — every setting, and who can touch them.
---

# Security

The Security group protects a server. **Antinuke** and **Antiraid** are locked tightest — only the
guild **owner or a listed antinuke admin** sees them, never a plain Discord admin or a manual
permission. The rest follow normal feature access. Security actions report to the **Mod-log channel**
set in [Settings → General](server-settings.md).

## Fake Permissions

Delegate what a role can manage **without** giving it real Discord permissions. The bot maps roles
to one of two things:

- A **Discord-permission bucket** (e.g. *Manage messages*, *Ban members*, `administrator` = master
  key) — the bot treats the role as if it held that permission for the bot's own commands and the
  matching dashboard features.
- **Exact dashboard features** — grant a role, say, just Autorole + Tickets, as **Manage** or
  **View-only**, optionally limited to specific channels.

Fake Permissions itself is **security-level**: only the guild owner / a super owner / an antinuke
admin can edit who holds manual perms (so a manual "administrator" can't mint more admins).

## Automod

Two layers. The page edits the server's native **Discord AutoMod** word rules, plus these bot-side
filters:

| Field | What it does |
| --- | --- |
| **Block Discord invites** | Deletes messages containing invites. |
| **Block all links** | Deletes messages containing links. |
| **Max mentions per message** | 0 = off; otherwise trips on more than N mentions. |
| **Action** | delete · timeout · kick · ban. |
| **Timeout duration** | Minutes, when action = timeout. |
| **Also filter staff** | Off by default (people with *Manage Messages* are exempt); on = filter everyone. |
| **Exempt roles** | Roles never filtered. |

Needs *Manage Messages* + the Message Content intent.

## Antiraid (Join Gate)

Screens new members. Bots and admins are never actioned; the bot needs *Kick/Ban Members*.

| Setting | What it does |
| --- | --- |
| **Block new accounts** | Action accounts younger than **N days** (kick / ban). |
| **Block no-avatar accounts** | Action accounts with the default avatar (kick / ban). |
| **Mass-join protection** | If **N joins within 10s**, treat as a raid and ban / kick the wave. |

## Antinuke

Limits what a compromised or rogue mod can destroy. Watches the audit log: if a **non-whitelisted**
member exceeds the threshold for a watched action within the time window, they're punished. The
server owner and the bot are always exempt.

- **Watched actions** (set a max of 1–6 each): Bans · Kicks · Channel create/delete · Role
  create/delete · Webhook creation · Emoji deletion · Bot additions.
- **Time window** (seconds).
- **Punishment**: `strip` (remove all their roles, never bans) · `jail` (strip + 24h timeout) ·
  `kick` · `ban`.
- **Whitelisted user IDs** (never actioned) and **Antinuke admin IDs** (exempt + trusted). In-server,
  the owner manages these with `/antinuke whitelist @user` and `/antinuke admin @user`.

Needs *View Audit Log* + the punishment permission, with the bot's role above the offenders'.

## Honeypot

Trap channels that catch bad actors. Any **non-admin** who posts in a trap channel is punished and
the message deleted — great for compromised/spam accounts.

- Add rows of **trap channel + punishment** (`ban` · `softban` · `kick` · `jail` = 24h timeout).
- Needs *Ban / Kick / Moderate Members*.

## At a glance

| Feature | Trigger | Response |
| --- | --- | --- |
| Automod | A message matching a rule | delete / timeout / kick / ban |
| Antiraid | New account, no avatar, or a join burst | kick / ban |
| Antinuke | A non-whitelisted member exceeding a threshold | strip / jail / kick / ban |
| Honeypot | A post in a trap channel | ban / softban / kick / jail |
| Fake Permissions | A role mapped to a permission or feature | acts without real Discord perms |
