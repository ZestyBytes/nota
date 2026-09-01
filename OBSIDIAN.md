# Publishing to Nota from Obsidian

Open `quartz/content` as an Obsidian vault. Everything you write there is
private by default; nothing reaches the live site until you explicitly
publish it, and publishing requires a Git push — there is no live editor,
upload form, or database behind `https://zestybytes.github.io/nota/`. It is
a static site, rebuilt fresh from your vault on every push to `main`.

## The publish cycle, end to end

1. Write or edit a note in `quartz/content` (in Obsidian, or any editor).
2. Set `publish: true` in its frontmatter when it's ready to go live. Leave
   it `false` (or omit it) to keep it private indefinitely — private notes
   never leave your machine's Git history in readable form on the site.
3. Commit and push to `main` (or merge a PR into `main`).
4. GitHub Actions runs `quartz/scripts/build-data.mjs`, which reads every
   published note and turns it into the data the app displays, then deploys
   the app to GitHub Pages. Takes about 30–40 seconds.

That's the whole loop. There's no separate "publish" button anywhere —
`publish: true` + a push **is** publishing.

## Can I use AI to help write entries?

Yes. Draft the body text however you like — dictate it, paraphrase it, ask
an AI to tidy up a rough note. Two things to keep in mind:

- **The frontmatter is what makes it appear correctly** — get `type` and
  `tags` right (reference below) or the entry either won't show up or will
  show up in the wrong place. If you ask an AI to draft a note, give it this
  file so it uses the right shape, and check the frontmatter yourself before
  setting `publish: true`.
- **Nothing publishes automatically.** An AI (including me, in a future
  session) can create or edit files in your vault, but the note still isn't
  live until you push it to `main`. That's a deliberate safety line — no
  tool can make something public in this system without a Git push
  happening.

## Where things live

```
quartz/content/
  journal/       journal entries
  journeys/      multi-day journeys (guitar practice, etc.)
  notes/         general notes
  quotes/        quotations (standalone or linked to a book)
  books/         reading list (type: reading)
  recipes/       recipe notes (a note with view: recipe)
  tasks/         to-do items (type: task) — create this folder yourself
  templates/     starting frontmatter for each type, see below
  private/       fully excluded from the build, whatever `publish` says
  drafts/        also excluded — a scratch space for anything mid-thought
```

`private/`, `drafts/`, `templates/`, and `.obsidian/` are never scanned for
content, regardless of `publish`. Use Obsidian's Templates feature (point it
at `templates/`) to start a new note in the right shape.

## Frontmatter reference

Every type takes `tags: [slug, ...]` — the topic(s) it belongs to. Valid
slugs today: `gardening`, `music`, `technology`, `adhd`, `books`, `family`,
`food`, `lifestyle`, `habits`. Adding a new one means adding it to the `TOPICS` object at the top
of `quartz/scripts/build-data.mjs` (and to `content/topics.md`'s grid if you
want it browsable).

**Journal** (`type: journal`) — a dated entry.
```yaml
title: "Staked the runner beans"
type: journal
tags: [gardening]
occurredAt: "2026-08-31"   # the date it's about
createdAt: "2026-08-31"    # the date you wrote it
publishedAt: "2026-08-31"  # first shown on Writing when this is set
publish: true
```
Body: first paragraph becomes the card excerpt everywhere. A leading
`![alt](url)` image becomes the entry's photo.

**Note** (`type: note`) — same shape as Journal, for things that aren't a
dated diary entry. Same fields.

**Journey** (`type: journey`) — a note that's part of an ongoing thread
(learning guitar, a project log). Same fields as Journal plus an optional
`journey: "Learning guitar"` label.

**Quote** (`type: quote`) — a standalone quotation, or one linked to a book.
```yaml
title: "Attention is the beginning of devotion"   # the quote, punctuation optional
type: quote
author: "Mary Oliver"
tags: [books]
createdAt: "2026-08-24"
publish: true
```
Body: put the quote itself as a `> blockquote` — that's what actually
displays; the title field is a fallback. To attach a quote to a book instead
of showing it standalone, add `book: "[[Exact Book Title]]"` and optionally
`page: 83` or `location: "Book XII"`.

**Book / reading** (`type: reading`) — goes to the Library, not the daily
feed.
```yaml
title: "The Anxious Generation"
type: reading
author: "Jonathan Haidt"
status: reading        # reading | finished | want-to-read
progress: 42            # 0-100, shown only while status: reading
tags: [books, adhd]
publish: true
```
Body: a `## Reading notes` section's first paragraph becomes the book's one
note. Quotes come from separate quote files linked with `book:` (above) —
not written inline here.

**Recipe** — a Note with `view: recipe` and extra fields:
```yaml
title: "Slow-roast tomato focaccia"
type: note
view: recipe
time: "3 hours"
serves: "8"
difficulty: "easy"
tags: [food, gardening]
publish: true
```
Body: put a `## You'll need` section with a `- ` bullet per ingredient.

**Task** (`type: task`) — shows on Today's To-do list. This folder doesn't
exist in the vault yet — create `quartz/content/tasks/` and drop task notes
in it.
```yaml
title: "Order more twine"
type: task
tags: [gardening]
dueAt: "2026-08-31"
completedAt: null        # or a date, once done
publish: true
```
No body needed.

## Previewing before you publish

You can still preview the old quartz-rendered view of your content (article
pages, backlinks, full-text search) if useful for reading back through the
vault:

```sh
cd quartz
npm install
npx quartz build --serve
```

Open `http://localhost:8080`. This preview isn't what gets deployed anymore
— it's just a reading view of the raw content. What actually ships is the
app itself; to preview *that* with your real data:

```sh
node quartz/scripts/build-data.mjs --out /tmp/nota-preview/data.js
cp index.html app.js styles.css config.js backend.js manifest.webmanifest icon.svg sw.js /tmp/nota-preview/
cd /tmp/nota-preview && python3 -m http.server 8787
```

Open `http://localhost:8787` — this is exactly what the live site will show
once you push.

## Safety notes

- Do not put genuinely sensitive writing in this repository at all, even
  with `publish: false` — it's still readable in Git history to anyone with
  repo access. Keep anything truly private in a separate, private vault.
- The generated `data.js` only ever includes notes with `publish: true`
  (and never `draft: true`). If something appears live that shouldn't have,
  set `publish: false` and push — it disappears on the next deploy, but
  stays in Git history, so rotate/redact anything sensitive rather than
  relying on unpublishing alone.
