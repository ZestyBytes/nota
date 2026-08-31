# nota

A private-first, read/search-only record of days, thoughts, books, quotations
and things worth keeping — written in Obsidian, published as a static PWA.

**Live:** <https://zestybytes.github.io/nota/>

## How this repo is put together

Two parts, and it's important to know which is which before changing either:

1. **The app** (repo root: `index.html`, `app.js`, `styles.css`, `data.js`,
   `config.js`, `backend.js`, `manifest.webmanifest`, `sw.js`) — a
   dependency-free, installable PWA. This is what actually gets deployed and
   what you see at the live URL. It is **read/search only**: there is no
   capture, edit, or delete UI. `data.js` at the repo root is demo/dev data
   only (used when you run it locally without building); the deployed site
   gets a real `data.js` generated from Obsidian content at build time (see
   below), not this file.

2. **The content pipeline** (`quartz/`) — an Obsidian vault
   (`quartz/content/`) plus `quartz/scripts/build-data.mjs`, a script that
   reads every published note in that vault and emits a `data.js` in the
   exact shape `app.js` expects. `quartz/` also still contains a full Quartz
   static-site setup (inherited from an earlier iteration) that can render
   the vault as a traditional linked-notes site for your own reading/preview
   — see "Alternate preview" below — but **that Quartz build is not what's
   deployed**; only its content-reading script is used in production.

The design system (palette, type, the specimen-archive motifs — mounting
tape, pinned topic tags, ink stamps, accession numbers) is recorded in
[`DESIGN.md`](DESIGN.md). Product intent and constraints are in
[`PRODUCT.md`](PRODUCT.md). Read both before making visual or structural
changes — they're the "why," this file is the "how."

## Publishing content

You write and manage everything in Obsidian (open `quartz/content` as your
vault). **[`OBSIDIAN.md`](OBSIDIAN.md) is the full guide** — frontmatter
reference for every content type (journal, note, journey, quote, book,
recipe, task), the publish cycle, and what AI assistance can and can't do in
this pipeline. Read that before adding content.

The short version: write a note with `publish: true` in its frontmatter,
commit, push to `main`. A GitHub Actions workflow (`.github/workflows/pages.yml`)
then rebuilds `data.js` from your vault and deploys the app — no manual
build step, no live editor on the site itself.

## Run locally

```sh
python3 -m http.server 8787
```

Open <http://localhost:8787>. This serves the app with the demo `data.js` at
the repo root — fine for design/UI work, but it is **not** your real content.

To preview with your actual published content (what the live site will
actually show once you push):

```sh
node quartz/scripts/build-data.mjs --out /tmp/nota-preview/data.js
cp index.html app.js styles.css config.js backend.js manifest.webmanifest icon.svg sw.js /tmp/nota-preview/
cd /tmp/nota-preview && python3 -m http.server 8787
```

## Alternate preview (Quartz's own rendered view)

`quartz/` can still build a traditional Quartz site from the same vault —
individual article pages, backlinks, full-text search over prose — useful
for reading back through the archive, but it is a separate reading view,
not the deployed app:

```sh
cd quartz
npm install
npx quartz build --serve
```

Open <http://localhost:8080>.

## Deploy

Push to `main` (or merge into it). `.github/workflows/pages.yml`:

1. Installs `quartz/`'s dependencies (needed for the `yaml` package
   `build-data.mjs` uses to parse frontmatter).
2. Copies the app files into `dist/`.
3. Runs `node quartz/scripts/build-data.mjs --out dist/data.js` to generate
   real data from `quartz/content`.
4. Deploys `dist/` to GitHub Pages.

Takes about 30–40 seconds end to end. Watch it with `gh run list --workflow=pages.yml`
or at `github.com/ZestyBytes/nota/actions`.

## Optional: Supabase-backed private mode

The app still supports an authenticated, multi-device mode via Supabase
(`backend.js`, `supabase/schema.sql`) — sign-in, private attachments, sync.
It is **not configured or used** in the current deployment (`config.js` is
blank, so the live site runs in demo/static mode against the generated
`data.js`). To use it instead of (or alongside) the Obsidian pipeline:

1. Create a Supabase project, run `supabase/schema.sql` once in the SQL
   Editor.
2. Copy the project URL and anon key into `config.js`.
3. Add the deployed URL as an allowed redirect URL in Supabase Auth settings.
4. Set `allowSignUp: false` in `config.js` once the owner account exists.

The anon key is intentionally public in the client; protection comes from
the Row Level Security policies in `supabase/schema.sql`. Never put the
service-role key in this repository. Note that turning this on re-introduces
write paths the current read-only UI doesn't expose — you'd need to restore
capture/edit UI in `app.js` to actually use it for writing.

## Safety notes

- Nothing in `quartz/content` reaches the live site unless it has
  `publish: true` — see `OBSIDIAN.md` for the full rule set (including
  `private/`, `drafts/`, and `templates/`, which are never scanned).
- Don't put genuinely sensitive writing in this repository at all, even with
  `publish: false` — it's still in Git history to anyone with repo access.
