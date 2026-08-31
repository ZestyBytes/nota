# nota

A quiet, public record of days, thoughts, things learnt and things worth keeping.

Nota v1 is a dependency-free static web app. Content types and topics are deliberately separate in `data.js`; capture and task state persist in the current browser with `localStorage`.

## View locally

From this directory, run:

```sh
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Publish

Push `main` to `ZestyBytes/Nota`, then in the repository settings choose **Pages → Source → GitHub Actions**. The included workflow deploys automatically and supports the `/Nota/` project path.

## Content model

- Types: Journal, Note, Reading, Quote, Journey, Task, Event, Collection
- Topics: independent, reusable labels; records may have several
- Dates: `createdAt`, `occurredAt`, `publishedAt`, `dueAt`, `completedAt`

Demo content is public. Do not place private writing in a public repository.
