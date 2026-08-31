# Nota

This repo **is** Nota — a personal archive app. Don't use a browser or any
external tool to "access" it; the site is just this repo's files, published
via GitHub Pages.

## Adding content (the common case)

When asked to add a journal entry, task, book, quote, or similar to Nota:

1. Read **`OBSIDIAN.md`** for the exact frontmatter shape for that content
   type. Don't ask the user for field names — infer sensible ones (today's
   date, a matching topic tag) and just show what you're about to write.
2. Create the file directly under `quartz/content/<type-folder>/` with
   `publish: true`.
3. Commit and push to `main` (confirm first — a push is outward-facing).
   That alone deploys it; there is no separate publish step.

No other setup, login, or clarification is needed — this is the whole flow.
