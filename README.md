# nota

A private-first record of days, thoughts, books, quotations and things worth keeping.

Nota is a dependency-free progressive web app. It can run as a local demo using browser storage, or as a private multi-device app backed by Supabase Auth, Postgres and Storage.

## What v1 includes

- Email/password authentication with persistent sessions
- Journals, notes, journeys, events, quotations, recipes and tasks
- Calendar and full-archive search
- Reusable topics with optional recipe/technology layouts
- Books with reading status, progress, notes and quotations
- Private attachments using short-lived signed URLs
- Private-by-default records with an explicit published state
- A public `#writing` view containing only published entries
- JSON export for portable backups
- Installable, responsive PWA layout

## Run locally

```sh
python3 -m http.server 8787
```

Open <http://localhost:8787>. With blank values in `config.js`, Nota remains in demo mode and saves to `localStorage`.

## Connect Supabase

1. Create a Supabase project.
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it once.
3. In **Project Settings → API**, copy the project URL and publishable/anon key into `config.js`.
4. In **Authentication → URL Configuration**, add the deployed Nota URL as an allowed redirect URL.
5. Create the owner account from Nota and confirm the email.
6. Set `allowSignUp: false` in `config.js` and disable new-user signups in Supabase once the owner account exists.

The browser anon key is intentionally public. Database protection comes from the Row Level Security policies in `supabase/schema.sql`. Never place the Supabase service-role key in this repository.

## Deploy

Push `main` to `ZestyBytes/Nota`. The GitHub Actions workflow publishes the repository to GitHub Pages and supports the `/Nota/` project path.

## Backups and AI capture

Use **Export archive** regularly; Supabase's free plan does not include automatic database backups.

The normalized tables are suitable for a future authenticated capture endpoint for ChatGPT or Claude. Do not give an AI tool the service-role key. Use a narrowly scoped server-side function that validates the owner and accepts only the required record fields.
