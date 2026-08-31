# Using Nota with Obsidian

Open `/home/jamie/Projects/Nota/quartz/content` as an Obsidian vault.

## Safe publishing

- New notes are private unless their frontmatter contains `publish: true`.
- `private/`, `templates/`, and `.obsidian/` are excluded from the public build.
- Do not put genuinely sensitive writing in a public Git repository, even with `publish: false`. Keep it in a separate private vault or private repository.
- The public website is static and contains no editor, upload endpoint, authentication screen, or write API.

## Suggested Obsidian features

Enable the built-in Daily Notes, Templates, Properties, Backlinks, Search and Bases features. Point Templates at `templates/`.

The supplied templates begin with `publish: false`. Change that property to `true` only when a note is ready to appear publicly.

## Preview the public site

```sh
cd /home/jamie/Projects/Nota/quartz
npm install
npx quartz build --serve
```

Open `http://localhost:8080`.

## Public deployment

Pushing the repository's `main` branch triggers the GitHub Pages workflow. It builds only `quartz/content` and uploads the generated `quartz/public` output.
