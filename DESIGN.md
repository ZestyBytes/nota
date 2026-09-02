# Design

<!-- impeccable:design-schema 1 -->

## World

**Naturalist Field Notebook / Herbarium Archive.** Every entry in Nota is a mounted specimen, not a feed item: a bordered card with mounting-tape corners, a pinned topic tag, an accession number, and a hard rubber-stamp mark for private/published status. Older entries fade like sun-bleached ink (time-depth cue). Direction seed key `df5200b8` (candidate 4, assigned).

The archive has two deliberately different entrances. **Spaces** groups things by subject and gives every room its own material language: kitchen recipe folio, developer console, record cabinet, reading room, field log, road book, family album, and personal dashboard. **Library** is the neutral catalogue, grouping those same records by format. Search remains in the primary navigation because retrieval is a core action rather than another archive category.

## Palette

Restrained ground with fully committed, saturated per-topic ink, never pastel chips.

- `--paper: #eef0e7`: pale sage-bone paper (cool, deliberately not cream)
- `--paper-alt: #e6e9dc`: secondary paper tone (selected calendar day, filter hover)
- `--surface: #f7f8f2`: specimen-sheet card ground
- `--ink: #22261e` / `--ink-soft: #3a3f32`: graphite text
- `--muted: #6d7360` / `--faint: #9aa08c`: secondary/tertiary text
- `--line: #cdd1bf`: rules and borders
- `--stamp-red: #a13a2e`: the one system accent: private stamps, danger actions, add-button dot, focus ring
- `--stamp-green: #3f6b2e`: published status text in the Library
- `--tape: rgba(138,90,18,.16)`: mounting-tape corner marks

Per-topic ink (saturated specimen-label colors, set in `data.js` `topics[id].color`): gardening `#3f6b2e`, music `#a13a2e`, technology `#1c6e63`, adhd `#5b4a9e`, books `#8a5a12`, family `#96355a`, food `#8a4a1a`. These render as filled pinned tags (`.mount-tag`) and outlined chips (`.chip`), never soft pastel fills.

## Type

- `--mono: "Space Mono"`: labels, nav, accession numbers, stamps, page titles, buttons, the wordmark. Justification: a naturalist's specimen tags are typewritten, not typeset serif: this is the system's structural voice, used at confident scale (page titles run `clamp(46px,7.4vw,96px)`, lowercase).
- `--serif: "Spectral"`: body prose: entry titles, excerpts, quotes, form text. Italic used functionally for excerpts/authors/quotes, never as decorative hero treatment.

Both faces load via Google Fonts (`index.html` `<link>`), with system fallbacks.

## Motifs (reused everywhere)

- **Mounting tape**: `::before`/`::after` diagonal amber strips at the top corners of every specimen-like container: `.entry`, `.book`, `.quote-card`, `.recipe-card`, `.modal`, `.auth-card`.
- **Accession number**: `No. ####` top-right of entry and book cards, deterministic from the record's id (`accNo()` in `app.js`).
- **Mount tag**: the primary topic name, pinned top-left, filled with the topic's ink color, rotated -2°, straightens slightly on hover.
- **Stamp**: `PRIVATE` rendered as a rotated bordered rubber-stamp mark (`.stamp`), never a soft color fade, but a hard state change. Shown only on an entry held back from the Writing page; everything else carries its date instead.
- **Postmark date block**: circular double-ringed date badge (`.date-large`) on Today/Calendar, rotated -4°.
- **Time-depth fade**: `.entry.aged` (30–180 days) and `.entry.archive` (180+ days) reduce opacity/saturation so older specimens visibly recede.
- **Pin-in motion**: modals enter with a single authored `pin` keyframe (slight rotate + scale + rise, exponential ease-out, ~220ms), respecting `prefers-reduced-motion`.

## Layout

Max width 1220px. Section headers are small tracked mono labels with a trailing rule (`.section-title`), never numbered/kickered above content headings. Filters and library tabs render as bordered mono tab strips, not pill buttons. The desktop nav is a vertical-rule-separated mono strip with ordinal numbers and an underline on the active item. On phones the persistent five destinations are Home, Calendar, Library, Spaces and To-do. Search stays in the desktop header and has a prominent field on Home; it does not displace a daily destination in the phone bar.

The archive follows the device colour scheme by default. A small sun/half-moon control in the masthead lets the reader override it, and that preference is remembered locally. Calendar photographs belong in the monthly contact sheet and selected-day record, not washed behind date numerals.

## What must not drift back in

- No pastel/soft chip fills; topic color is always committed (fill on tags, outline on chips).
- No gradient text, no soft rounded-rectangle placeholders, no default Inter/system-sans display type.
- No kicker/eyebrow above headings other than the existing `.eyebrow` micro-label pattern already in the system (kept: it's structural metadata, not decoration, and predates this rule's ban intent minimally; do not add new ones elsewhere without reason).
- Status is always a stamp (hard), never a colored dot or soft badge.

## Provenance

Topic spaces preferentially use the author's own archive photography and real book covers. Bespoke editorial images in `assets/posts/` were generated locally for records that had no suitable personal image; remote stock-image URLs are not used. Reading, Technology and Music previews on the Spaces index are assembled from existing book covers or drawn entirely in CSS. Fonts remain the two Google Fonts above.
