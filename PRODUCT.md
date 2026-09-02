# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jamie, the sole owner and user. A single-person private journal/notebook, not a multi-tenant product; no other accounts are expected to sign up.

## Product Purpose

Noted is a private-first record of days, thoughts, books, quotations, and things worth keeping. It exists to give Jamie one unified place to capture journals, notes, journeys, events, quotations, recipes, and tasks, instead of scattering them across separate apps. Success is a daily record that's low-friction to capture into and pleasant to browse back through (calendar, full-archive search, topics, book library).

## Positioning

A unified daily record: one dependency-free PWA covering journaling, notes, quotations, books, recipes, and tasks together, rather than a single-purpose notes or journaling app. It runs private-by-default (demo mode with localStorage, or a private multi-device Supabase-backed instance), with an explicit per-record published state that surfaces only chosen entries in a public `#writing` view.

## Operating Context

- Runs as an installable, responsive PWA; works offline-capable via `sw.js`.
- Two data modes: local demo (blank `config.js`, browser `localStorage`) or Supabase-backed (Auth, Postgres, Storage) for private multi-device sync.
- Content types: journals, notes, journeys, events, quotations, recipes, tasks, books (with reading status/progress/notes/quotations), and reusable topics with optional recipe/technology layouts.
- Views: Today, Calendar, Library, Topics, Writing (public, published-only), Search (full-archive).
- Private attachments served via short-lived signed URLs.
- JSON export for portable backups (Supabase free plan has no automatic DB backups, so export is the backup path).
- Deployed via GitHub Actions to GitHub Pages under the `/noted/` project path from `main`.
- A separate Quartz/Obsidian-based static site (`quartz/`) exists alongside the app, a different content-publishing surface, not the Noted app UI itself.

## Capabilities and Constraints

- Dependency-free: no frontend framework/build step for the core app (`app.js`, `backend.js`, `data.js`, `config.js`, `styles.css`, `index.html`).
- Supabase anon key is intentionally public in the client; protection comes from Row Level Security policies in `supabase/schema.sql`. The service-role key must never enter the repo or be given to any AI tool.
- Signups are disabled (`allowSignUp: false`) once the owner account exists: single-owner by design, not currently built for multi-user auth flows.
- `design-lab/` is an abandoned/reference experiment (Georgia serif + pink-accent editorial look): not authoritative for the current UI; do not treat it as an incumbent direction to extend.

## Brand Commitments

- Name: "noted" (lowercase wordmark, styled `noted.` with the period in an accent color).
- Existing visual identity in the root app (`styles.css`, `icon.svg`): warm paper background (`#f7f5f0`), dark ink text (`#24231f`), Georgia serif for headings/display type, Inter/system sans for UI text, a rose/pink accent (`#b35472`). This is the current incumbent system, evidenced by shipped code, and separate from and not to be confused with `design-lab/`.

## Evidence on Hand

- Real, working app code and schema (`app.js`, `backend.js`, `data.js`, `supabase/schema.sql`): no fabricated content, testimonials, or metrics exist and none should be invented.
- No confirmed accessibility standard beyond what's in the current markup (semantic nav, `aria-live` toast, etc.).

## Product Principles

1. Single source of truth for a personal record: don't fragment capture across content types; keep journals, notes, books, quotations, recipes, and tasks in one coherent surface.
2. Private by default, published by explicit choice: never assume content is shareable.
3. Dependency-free and low-friction: the app should stay simple to run locally (`python3 -m http.server`) and deploy (static GitHub Pages), without adding build tooling unless Jamie decides otherwise.
4. Treat `design-lab/` as discarded exploration, not as evidence of where the UI is heading, unless Jamie says otherwise.
