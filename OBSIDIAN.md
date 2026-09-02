# Publishing to Noted from Obsidian

Open `quartz/content` as an Obsidian vault. Everything you write there is
private by default; nothing reaches the live site until you explicitly
publish it, and publishing requires a Git push. There is no live editor,
upload form, or database behind `https://zestybytes.github.io/noted/`. It is
a static site, rebuilt fresh from your vault on every push to `main`.

## The publish cycle, end to end

1. Write or edit a note in `quartz/content` (in Obsidian, or any editor).
2. Set `publish: true` in its frontmatter when it's ready to go live. Leave
   it `false` (or omit it) to keep it private indefinitely; private notes
   never leave your machine's Git history in readable form on the site.
3. Commit and push to `main` (or merge a PR into `main`).
4. GitHub Actions runs `quartz/scripts/build-data.mjs`, which reads every
   published note and turns it into the data the app displays, then deploys
   the app to GitHub Pages. Takes about 30–40 seconds.

That's the whole loop. There's no separate "publish" button anywhere:
`publish: true` + a push **is** publishing.

## Can I use AI to help write entries?

Yes. Draft the body text however you like: dictate it, paraphrase it, ask
an AI to tidy up a rough note. Two things to keep in mind:

- **The frontmatter is what makes it appear correctly**: get `type` and
  `tags` right (reference below) or the entry either won't show up or will
  show up in the wrong place. If you ask an AI to draft a note, give it this
  file so it uses the right shape, and check the frontmatter yourself before
  setting `publish: true`.
- **Nothing publishes automatically.** An AI (including me, in a future
  session) can create or edit files in your vault, but the note still isn't
  live until you push it to `main`. That's a deliberate safety line: no
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
  scraps/        short undated captures (type: scrap), shown as a pinboard
  attachments/   photographs added from Obsidian land here
  tasks/         to-do items (type: task), create this folder yourself
  templates/     starting frontmatter for each type, see below
  private/       fully excluded from the build, whatever `publish` says
  drafts/        also excluded, a scratch space for anything mid-thought
```

`private/`, `drafts/`, `templates/`, and `.obsidian/` are never scanned for
content, regardless of `publish`. Use Obsidian's Templates feature (point it
at `templates/`) to start a new note in the right shape.

## Frontmatter reference

Every type takes `tags: [slug, ...]`, the topic(s) it belongs to. Valid
slugs today, with children indented under their parent:

```
family
life          selfcare, adhd, habits
music         playlist, practice
reading
food          recipes, eatingout
technology
motoring
gardening
```

Tag a note with a child when it fits one, `recipes` rather than `food`; the
parent gathers its children's items either way. A topic nothing uses is left
out of the build entirely, so a child can be declared long before anything is
filed under it.

**Journal** (`type: journal`): a dated entry.
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

Add `writing: true` to a Journal, Note or Journey to put it on the Writing
page, which is a chosen selection rather than a copy of the whole archive.
Without it a piece still lives in the archive, it simply is not featured.

Add `view: cards` to a Journal, Note or Journey and its page becomes a
swipeable deck instead of flowing prose: one card per paragraph, or one per
`##` heading if the note uses them. Good for a numbered list of points,
wrong for ordinary writing, so it is opt-in.

`view: playlist` sets a note's bullets as a numbered listing instead of a
bulleted paragraph, for records, podcasts and audiobooks. An italic tail on
a line becomes its second line, so `- Dermot Kennedy, *Sonder*` reads as the
artist with the record underneath.

**Note** (`type: note`): same shape as Journal, for things that aren't a
dated diary entry. Same fields.

**Journey** (`type: journey`): a note that's part of an ongoing thread
(learning guitar, a project log). Same fields as Journal plus an optional
`journey: "Learning guitar"` label.

**Quote** (`type: quote`): a standalone quotation, or one linked to a book.
```yaml
title: "Attention is the beginning of devotion"   # the quote, punctuation optional
type: quote
author: "Mary Oliver"
tags: [books]
createdAt: "2026-08-24"
publish: true
```
Body: put the quote itself as a `> blockquote`; that's what actually
displays; the title field is a fallback. To attach a quote to a book instead
of showing it standalone, add `book: "[[Exact Book Title]]"` and optionally
`page: 83` or `location: "Book XII"`.

**Book / reading** (`type: reading`): goes to the Library, not the daily
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
Add `cover: "https://…/cover.jpg"` (or a path like `assets/books/x.jpg`) to
show real cover art. Without one the Library sets a typographic plate from
the title instead, so a book never looks broken for want of a picture.

Body: a `## Reading notes` section's first paragraph becomes the book's one
note. Quotes come from separate quote files linked with `book:` (above),
not written inline here.

**Recipe**: a Note with `view: recipe` and extra fields:
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
Body: put a `## You'll need` section with a `- ` bullet per ingredient, and
a `## Method` section with the steps, either bulleted or numbered. The page
sets the time, servings and difficulty as a fact strip, the ingredients as a
list you can tick off while cooking (remembered on that phone), and the
method as a section you can collapse. No need to repeat the facts as a table
in the body.

**Task** (`type: task`): shows on Today's To-do list. This folder doesn't
exist in the vault yet, so create `quartz/content/tasks/` and drop task notes
in it.
```yaml
title: "Order more twine"
type: task
tags: [gardening]
dueAt: "2026-08-31"
completedAt: null        # or a date, once done
publish: true
```
No body needed. To finish a task, either add `done: true` (quickest on a
phone, and the day you save the file is taken as the day it was done) or put
a date in `completedAt`. Finished tasks drop to "Recently completed" at the
foot of the To-do page, struck through.

## Blocks you can use in any body

None of these need frontmatter. They work in a journal entry, a note, a
recipe, anywhere with a body.

**Photographs.** Attach as many as you like. The first becomes the entry's
image; more than one becomes a swipe gallery with a counter and dots, and the
card in any list carries a stacked-corner badge with the count.

**Callouts.** Obsidian's own aside syntax renders as a marked box, in the
colour of its kind:

```
> [!warning] Watch the oven
> It runs hot, so check it ten minutes early.
```

`note`, `info`, `tip`, `success`, `question`, `warning`, `caution`, `danger`,
`bug`, `todo`, `example`, `quote` and `summary` are recognised. The title after
the marker is optional. A plain `>` line is still an ordinary quotation, and
consecutive `>` lines are now one block rather than one quotation per line.

**Checklists.** A list where every line opens with a box becomes tickable on
the page, and the ticks are remembered on that device:

```
- [ ] Passports
- [x] Charger
```

A `- [x]` starts ticked. Mix a box line with ordinary bullets and the whole
list stays an ordinary list, so a stray box in prose changes nothing.

**Video and music.** A YouTube, Vimeo or Spotify link alone on its own line
becomes the player itself. Only those three, matched by exact host, so a
pasted link cannot load an arbitrary frame. A link inside a sentence stays a
link.

**Journeys.** A note in `journeys/` with `type: journey` and a `journey:` name
belongs to a thread. Give every entry in the same undertaking the same name,
and either a `day:` number or a title beginning "Day 5:", and the app builds
the thread: its own page in day order, how far it has run, and a link on each
entry to the rest. They have their own tab under Library, Journeys.

A journey heading for a number can show a progress bar. Declare the goal once,
on whichever entry is easiest (usually the first), and then give each check-in
its reading:

```yaml
# on the first entry only
start: 92
target: 82
unit: kg
metric: 92      # this entry's reading
```

```yaml
# every check-in after that
metric: 89.6
```

The bar fills from `start` towards `target` and works in either direction, so
counting down to 82kg and counting up to a 20 mile run both read correctly.
The latest reading, how far you have come and how far is left all show on the
journey page, and each reading shows beside its entry in the thread.

A journey with no numbers gets a mark per entry instead, one dot for each
thing kept, which fills up as the thread grows.

**Scraps.** A note in `scraps/` with `type: scrap` is a thing caught in
passing rather than a dated entry. The title is the scrap, since that is what
shows on the board; anything in the body appears under it in smaller type.
They are pinned as cards under Library, Scraps, and carry no accession number
and no stamp. `occurredAt` is optional.

## Topic card pictures

Each topic on the Topics page can carry a photograph as its whole card
background. Topics name theirs in `quartz/scripts/build-data.mjs`, on the
`photo:` field:

```js
gardening: { name: "Gardening", ..., photo: "7728082", ... }
```

That value takes whatever is easiest to paste:

- **a Pexels photo id**, the digits at the end of any Pexels address
- **a Pexels page URL**, copied straight from the browser's address bar
- **any full image URL**, from Pexels, Unsplash or anywhere else
- **a path inside the repo**, such as `assets/journal/first-mini-seafront.jpg`

A Pexels id or page URL is expanded at build time into the image URL at
1400px wide, which is about right for a card on a phone without pulling a
full size original over mobile data.

Leave `photo: ""` and the topic falls back to the most recent photograph
taken under it, and failing that to its drawn ground. A card whose picture
fails to load also drops back to the drawn ground, so a broken link costs
nothing.

## Writing from a phone or a MacBook

The vault is a folder in a Git repository, so any device that can edit that
folder and push can publish. Nothing else is needed, and the app stays
read-only.

### iPhone or iPad

Obsidian for iOS will not open a vault that lives inside Working Copy, so the
order is the other way round: make the vault first, then point Working Copy at
it.

1. Install **Working Copy** and **Obsidian** from the App Store. Working Copy
   is free to install, but both pushing commits and linking an external
   directory need its Pro unlock, £29.99 one off, with a free ten day trial.
2. In Working Copy, tap **+**, choose **Clone repository**, tap **GitHub** and
   sign in. This is only to authorise the account; the clone it makes is not
   the copy Obsidian uses.
3. In the **Files** app: **Browse**, the **⋯** button, **Edit**, switch
   **Working Copy** on as a location.
4. In Obsidian, answer "Where is your vault located?" with **Other**, then
   **Create vault**. Name it `noted` and store it **On my iPhone**. It will be
   empty.
5. Back in Working Copy, tap **+** on the repository list, then
   **Link external repository** and **Directory**. Choose
   **On my iPhone › Obsidian › noted**.
6. Open **Repository**, add a remote named `origin` pointing at
   `https://github.com/ZestyBytes/noted`, and **Save**.
7. Tap **origin**, then **Fetch**. Go back, tap **Revert changes** to clear
   the `.obsidian` folder Obsidian just wrote, then **Branch** and check out
   **origin/main**.
8. Open Obsidian. The vault now holds the repository, and the writing lives in
   `quartz/content`.

Afterwards the loop is: write in Obsidian, then in Working Copy commit and
push. The site rebuilds in about forty seconds. The Shortcut below reduces
that second half to a single tap, and is worth setting up straight away.

#### Three Obsidian settings

Because the git root has to be the vault root, the vault contains the whole
repository, not just the content folder. These make that comfortable, and all
are per device, since `.obsidian` is deliberately not committed:

- **Settings › Core plugins › Templates**, then set the template folder to
  `quartz/content/templates`. To reach the command on a phone, go to
  **Settings › Mobile › Manage toolbar options**, add a command, and pick
  **Templates: Insert template**. It then sits on the editor toolbar as a
  button, which is easier than hunting for the command palette.
- **Settings › Files and links › Excluded files**: add `assets`,
  `quartz/quartz`, `tests`, `supabase` and `.github` to keep them out of
  search and suggestions.
- **Settings › Files and links › Default location for new attachments**:
  choose **In the folder specified below** and enter
  `quartz/content/attachments`. Obsidian otherwise drops photographs at the
  vault root, which here is the repository root. The build finds them either
  way, but this keeps them with the writing.

#### Publishing in one tap

Working Copy exposes actions to the Shortcuts app, so the whole commit and
push routine can be one button on the home screen. In **Shortcuts**, make a
new shortcut named `Publish Noted` and add three actions, in this order:

1. **Commit Repository**, repository `noted-2`, message `Committed on iPhone.`
2. **Pull Repository**, repository `noted-2`
3. **Push Repository**, repository `noted-2`

Two settings inside the Commit action matter:

- **What to Commit** must be `modified`, not `staged`. A new note is untracked
  and would otherwise be left behind, so the shortcut would commit nothing.
- **Fail when nothing to Commit** off, so tapping the button with nothing
  written does nothing rather than throwing an error.

Set each repository field explicitly and check it goes solid rather than
staying a pale "Repository" placeholder; an empty field makes Shortcuts stop
and ask at run time, once per action. Leave the editor with the back arrow to
save, then add the shortcut to the home screen.

The order matters. Commit has to come first: pulling on top of uncommitted work
is refused, and the shortcut stops with "the pull was aborted because your
uncommitted changes conflict with the fetched changes". Committing first banks
what you wrote, so the pull has something to merge into.

After that, publishing is: write, tap **Publish Noted**, done. It commits
everything that has changed, so anything not ready to go live wants
`publish: false` in its frontmatter rather than being left uncommitted. Tapping
it before you start writing is worth the habit too, since it brings the phone
up to date and leaves nothing to collide with.

If the same lines were changed in both places, the shortcut stops with "unable
to push changes, that couldn't be fast-forwarded", and Working Copy shows the
repository with a conflicted entry. Tap **Resolve Conflicts** and pick a side:
your version sits on the left, the fetched one on the right, and a block only
counts as chosen once it is dragged into the centre; blocks left at the edges
are excluded. Resolve, then tap the shortcut again. Note that Obsidian rewrites
frontmatter in its own style, so most conflicts on a note you have both touched
are only formatting, `tags: [technology]` against a bulleted list, and either
side will do.

### MacBook

Nothing special: clone the repo, open `quartz/content` as a vault in Obsidian
for Mac, and commit and push with whatever Git tool you like. It is the same
repository the phone and the Linux machine use.

### Two things worth knowing

- Only one device should be mid-edit at a time. Pull before writing and push
  when done, or you will be resolving merge conflicts in a text editor on a
  phone, which is nobody's idea of a good evening.
- Photographs work from anywhere in the vault. Attach one in Obsidian however
  that device is set up, whether it writes `![[IMG_4821.jpg]]` or ordinary
  markdown, and the build finds the file, copies it into the deploy and
  rewrites the reference. To give a photograph a caption, write it as
  `![Caption here](IMG_4821.jpg)` or `![[IMG_4821.jpg|Caption here]]`; a bare
  embed simply has none. Hand-placed images in the repository's top-level
  `assets/` folder keep working exactly as before.

## Previewing before you publish

You can still preview the old quartz-rendered view of your content (article
pages, backlinks, full-text search) if useful for reading back through the
vault:

```sh
cd quartz
npm install
npx quartz build --serve
```

Open `http://localhost:8080`. This preview isn't what gets deployed anymore;
it's just a reading view of the raw content. What actually ships is the
app itself; to preview *that* with your real data:

```sh
node quartz/scripts/build-data.mjs --out /tmp/noted-preview/data.js
cp index.html app.js styles.css config.js backend.js manifest.webmanifest icon.svg sw.js /tmp/noted-preview/
cd /tmp/noted-preview && python3 -m http.server 8787
```

Open `http://localhost:8787`. This is exactly what the live site will show
once you push.

## Safety notes

- Do not put genuinely sensitive writing in this repository at all, even
  with `publish: false`; it's still readable in Git history to anyone with
  repo access. Keep anything truly private in a separate, private vault.
- The generated `data.js` only ever includes notes with `publish: true`
  (and never `draft: true`). If something appears live that shouldn't have,
  set `publish: false` and push; it disappears on the next deploy, but
  stays in Git history, so rotate/redact anything sensitive rather than
  relying on unpublishing alone.
