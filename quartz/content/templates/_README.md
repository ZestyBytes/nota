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

Name the file after the title, in lower case with hyphens, for example
`the-first-mini.md`. That name becomes the entry's address on the site.

## Tags

Tags are what drive the Topics page. Use these, and nothing else, or the entry
will simply carry no topic:

`gardening`, `music`, `technology`, `selfcare`, `adhd`, `books`, `family`,
`food`, `recipes`, `eatingout`, `lifestyle`, `habits`, `playlist`, `motoring`

## Dates

Every `YYYY-MM-DD` is a real date to type in, for example `2026-09-01`.
`occurredAt` is when the thing happened and is what Calendar sorts by.

## Publishing

`publish: true` is already set in every template. Push the file and the site
rebuilds itself in about a minute. Set it to `false` to keep something private.

Full field reference: `OBSIDIAN.md` at the root of the repository.
