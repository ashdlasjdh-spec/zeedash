---
title: Roblox group
description: Manage the Roblox group from the panel — join requests, ranks, kicks, shout — plus analytics.
---

# Roblox group

The **Group** page manages the Roblox group. Full access needs **head of staff+ (242)** (host 234 and
content-creator-manager 235 are also allowed), bulk request ops need **overseer+ (248)**. Access can
also be **delegated** to a Discord role or narrowed to a single staff track — see
[Role Access](role-access.md).

## Join requests

Load the pending queue and act on it:

- **Accept** / **Decline** each request individually.
- **Accept all** / **Decline all** the whole queue at once (with a confirm) — overseer+.

## Member rank & removal

Look up a member by username/ID, then:

- **Set rank** — pick any role from the group's ladder and **Change rank**.
- **Promote ►** / **◄ Demote** one rank at a time.
- **Kick** — remove them from the group.

Rank changes are bounded: a full manager (who isn't a named owner) can't assign a rank **at or above
their own level**, and a delegated role is capped at the **highest rank** it was granted.

## Group shout

Post (or clear) the group's shout — up to 255 characters. Requires the shout permission /
delegation.

## Scoped & delegated access

Two narrower modes exist so a low staff role can help without full power:

- **Scoped** (e.g. "Leaderboard HR") — may only rank people **to**, and kick people who hold, a
  specific set of ranks (Crew Leader / Leaderboard / Star), matched by rank name. The rank dropdown
  and buttons hide everything else.
- **Delegated** (via [Role Access](role-access.md)) — the role runs exactly the group actions it was
  granted, up to its rank ceiling. The UI hides any action the API would reject.

## Analytics

The **Analytics** page (full group access) charts group activity and ban trends over time.

## Command stats

The **Command stats** page shows how the dashboard and bot are being used over the last 7 / 30 / 90
days:

- **Usage** — total commands run, with a per-day bar chart.
- **Top commands**, **Top users**, and **Staff activity** (mod/grant actions + commands per staff
  member).

## Where the numbers come from

The bot reports activity to the dashboard once a minute as **deltas** (not running totals, so a
restart never double-counts). The dashboard rolls them up per guild / channel / member per day; the
public front page reads a small cached aggregate, and staff analytics read the same tables.
