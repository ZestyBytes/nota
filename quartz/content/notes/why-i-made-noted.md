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

I made Noted because too much of life disappears into places I rarely return
to: photographs in a camera roll, thoughts in a notes app, books on a shelf,
jobs on a to-do list, and small memories that never get written down at all.

I wanted one place that could hold all of it without feeling like another
productivity system. Something personal, playful and calm; a place I would
actually enjoy revisiting, and could share with family and friends.

## What belongs here

Noted is part journal, part library and part personal archive. A school morning
can sit beside a car story, a recipe, a quotation, a technical log or the next
step in learning guitar. They are different kinds of record, but they all
belong to the same life.

The app offers a few ways back into them:

- **Home** explains the archive and shows what was added recently.
- **Calendar** returns to the things that happened on a particular day.
- **Library** groups records by what they are: writing, books, quotations,
  notes and photographs.
- **Spaces** groups them by what they are about. Each room has its own design
  because food, music, technology and family should not feel interchangeable.
- **To-do** keeps practical things visible without making them the centre of
  the archive.

## How it works

Everything begins as an ordinary Markdown file in **Obsidian**. That means the
writing is mine, readable without a special service, and easy to keep for the
long term. Photographs and videos can be added from the same vault.

On my phone, **Working Copy** lets me commit those files to GitHub. A publish
flag in a note decides whether it is included on the site, so drafts and
private material can remain in the vault.

When a change reaches GitHub, an automated build reads the Obsidian files from
the **Quartz 5** content folder. A small JavaScript data builder turns their
frontmatter, Markdown, links and media into the archive Noted expects. The
front end is a lightweight custom progressive web app, so it can be installed,
work from a cache and update itself when a new version is published.

The finished static files are deployed to **GitHub Pages**. There is no public
editor and no database required for the published archive: the Markdown files
remain the source of truth.

In short:

`Obsidian → Working Copy → GitHub → build → GitHub Pages`

## Why build it this way

I like that the technology stays behind the writing. The archive does not own
the memories; it is simply a way of arranging files I already control.

It can also grow slowly. A new topic can become its own room. A run of related
entries can become a journey. The design can change without rewriting the
content underneath it.

Noted is still becoming itself, which is part of the appeal. It is not meant to
be a perfect record of everything. It is a place for the things I would be
sorry to forget.
