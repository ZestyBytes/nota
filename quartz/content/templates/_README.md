# Templates

Copy one of these into the right folder, rename the file, fill it in, push.
Nothing in this folder is ever published; the build skips it entirely.

## Which folder

| Template | Goes in |
| --- | --- |
| `journal.md` | `journal/` |
| `note.md` | `notes/` |
| `journey.md` | `journeys/` |
| `task.md` | `tasks/` |
| `quote.md` | `quotes/` |
| `book.md` | `books/` |
| `recipe.md` | `recipes/` |
| `playlist.md` | `notes/` |
| `checklist.md` | `notes/` |
| `scrap.md` | `scraps/` |

Name the file after the title, in lower case with hyphens, for example
`the-first-mini.md`. That name becomes the entry's address on the site.

## Tags

Tags are what drive the Topics page. Use these, and nothing else, or the entry
will simply carry no topic:

`gardening`, `music`, `technology`, `selfcare`, `adhd`, `books`, `family`,
`food`, `recipes`, `eatingout`, `lifestyle`, `habits`, `playlist`, `motoring`

## Blocks you can use in any note

These work in the body of any entry, no frontmatter needed.

**Photographs.** Attach as many as you like. One becomes the entry's image;
more than one turns into a swipe gallery with a counter, and the card in lists
shows how many. Nothing to switch on.

**Callouts.** Obsidian's own aside syntax renders as a marked box:

```
> [!warning] Watch the oven
> It runs hot, so check it ten minutes early.
```

`note`, `tip`, `warning`, `danger`, `question`, `quote`, `bug`, `todo` and
`example` each get their own colour. A plain `>` line stays an ordinary
quotation.

**Checklists.** A list where every line starts with a box becomes tickable,
and stays ticked on that device:

```
- [ ] Passports
- [x] Charger
```

**Video and music.** A YouTube, Vimeo or Spotify link alone on its own line
becomes the player itself. A link in the middle of a sentence stays a link.

## Dates

Every `YYYY-MM-DD` is a real date to type in, for example `2026-09-01`.
`occurredAt` is when the thing happened and is what Calendar sorts by.

## Publishing

`publish: true` is already set in every template. Push the file and the site
rebuilds itself in about a minute. Set it to `false` to keep something private.

Full field reference: `OBSIDIAN.md` at the root of the repository.
