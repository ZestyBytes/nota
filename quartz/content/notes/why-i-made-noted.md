---
title: Why I made Noted
type: note
tags: [life, technology]
occurredAt: "2026-09-02"
createdAt: "2026-09-02"
publishedAt: "2026-09-02"
writing: true
publish: true
---

I did not set out to build another notes app. I wanted to stop the small,
important parts of life from disappearing into places I rarely return to.

Photographs were sinking through the camera roll. Thoughts were spread across
notes. Books went back on the shelf with their best lines still inside them.
Jobs lived in a to-do list, memories in messages, and plenty of ordinary days
were never written down at all.

![The scattered pieces of an ordinary life gathering into one personal archive.](assets/posts/noted-why-collage.png)

## The problem I was trying to solve

Nothing was truly lost, but everything was fragmented. Each app was good at
holding one kind of thing and poor at helping me see the whole of it again.
The cost was not storage. It was return.

| The thing | Where it tended to vanish |
|---|---|
| A small family memory | Messages or the camera roll |
| A thought worth keeping | A forgotten note |
| A line from a book | Somewhere between the page and my memory |
| A recipe that worked | A browser tab or a scrap of paper |
| A job that mattered | A list I stopped looking at |

I wanted one place where a school morning could sit beside a car story, a
recipe, a quotation, a technical log or the next step in learning piano. Not
because they are the same kind of record, but because they belong to the same
life.

> The aim was simple: make the things worth keeping easy to capture, pleasant
> to revisit, and possible to share without turning my life into a content
> management project.

## What Noted became

Noted is part journal, part library and part personal archive. It is not a
productivity system asking to be maintained. It is a calm, playful way back
into things I have already lived, noticed, read, made or meant to do.

There are several doors into the same collection:

- **Home** is the front desk: a quick sense of what is happening and what was
  added recently.
- **Calendar** puts records back on the days they belonged to.
- **Library** groups them by form: writing, highlights, journeys, books and
  photographs.
- **Spaces** groups them by subject. Food, music, technology and family each
  get a room with its own character.
- **To-do** keeps practical things visible without letting them take over the
  archive.

The interface is intentionally just for reading and wandering. There is no
public editor, account or sign-in screen. A link opens straight onto the thing
I wanted to share.

## Why these particular tools

The technical choices came after the problem, but building it was also a very
good technical exercise. I wanted to see how far a personal site could go
without a paid platform, a database or a complicated publishing system.

**Obsidian is where the notes already are.** Everything begins as an ordinary
Markdown file in my vault. I do not have to write twice or move an idea into a
special publishing tool. The files remain readable, portable and mine.

**GitHub is the bridge and the history.** It keeps the files, records each
change and starts the build whenever I publish. It also made the project a
useful exercise in turning plain content into a small, maintainable web app.

**GitHub Pages is the free front door.** The result is a set of static files,
so it can be hosted for free. There is no server to run, database to pay for or
account system to look after.

**The custom interface is the fun part.** Markdown does not decide what the
archive has to feel like. I can give a recipe a kitchen layout, books a reading
room and family photographs an album, while all of them still come from the
same simple files.

## How the pieces fit together

On the phone, an Apple Shortcut hands the changed vault files to **Working
Copy**, which commits and pushes them to GitHub. That removes the laptop from
the publishing ritual: I can finish a note, mark it for publication and send
it from wherever I wrote it.

A small `publish: true` flag is the gate. Drafts and private material can stay
in the same vault without appearing on the public site.

Once the change reaches GitHub, an automated build reads the Obsidian files
from the **Quartz 5** content folder. A JavaScript builder translates their
frontmatter, Markdown, links and media into the data Noted expects. The custom
progressive web app then turns that data into the archive you are reading.

The result is deliberately uneventful infrastructure: write, choose to share,
tap the shortcut, and roughly half a minute later the new version is live.

## The useful constraints

Keeping the published site static made several decisions easier:

- **No authentication:** there is nothing to log into because editing happens
  in Obsidian, not on the website.
- **No public database:** the Markdown files are the source of truth.
- **No hosting bill:** GitHub Pages serves the finished files.
- **No lock-in:** the archive survives even if the interface changes.
- **Private by default:** only a deliberate publish flag crosses the boundary.

Those constraints are not missing features. They are what let Noted stay small
enough to understand and personal enough to trust.

## Still becoming itself

The satisfying part is that the content and the presentation can evolve
separately. A new subject can become its own room. A run of related entries can
become a journey. A journey heading somewhere measurable can gain a progress
bar. None of that requires rewriting the memories underneath it.

Noted is not meant to be a perfect record of everything, and it is not a
startup disguised as a notebook. It is a home for the things I would be sorry
to forget, plus an excuse to keep learning how to make thoughtful software.
