# Zee Hood docs (Zensical)

The Zee Hood control-panel documentation, built with [Zensical](https://zensical.org) — the static
site generator from the makers of Material for MkDocs. This is a rewrite of the old in-app
`app/docs` React pages as plain Markdown, with Mermaid diagrams, admonitions and card grids.

## Prerequisites

- **Python 3.10+** (Zensical is a Python tool; the surrounding dashboard is Node/Next.js and does
  not need it).

## Install

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install zensical
```

## Develop

From this folder (`docs-site/`, where `zensical.toml` lives):

```bash
zensical serve
```

Live-reloading preview on <http://localhost:8000>.

## Build

```bash
zensical build
```

Outputs a static site to `site/` (git-ignored), ready to deploy to any static host.

## Layout

```
docs-site/
├── zensical.toml          # site config + nav (order here drives prev/next)
└── docs/
    ├── index.md           # Overview
    ├── access.md          # Access & roles
    ├── game-control.md    # Game portal
    ├── moderation.md
    ├── server-management.md
    ├── crew-tags.md · emojis.md · levels.md · tickets.md
    ├── game-site.md · staff-sync.md · security.md · automation.md · stats.md
    ├── architecture.md · pages.md
    └── stylesheets/extra.css
```

To add or reorder pages, edit the `nav` array in `zensical.toml` — prev/next links and the sidebar
follow it automatically.
