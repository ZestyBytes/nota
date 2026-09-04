# Content audit

Working checklist for replacing seeded content and placeholder images with the
real thing. Not published; this file is repo furniture, not a note.

Tick a line when the content is true and the images are yours.

## 1. Journeys

- [x] **108 to 90** (fitness). Rebuilt. Week 1 at 108kg, target 90, 100kg
      flagged in the body as the milestone to celebrate. Weekly Friday weigh-in.
      Replaced the old "Ten kilos" thread, which claimed a July to August drop
      that contradicts 108kg being the current heaviest.
- [x] **Fifteen minutes a day** (fitness). Day 1. Counts days kept towards 90.
      HIIT, ten thousand steps, or the walks with Martha.
- [x] **Learning piano** (music). Day 0, zero hours, counting up to 100 hours.
      Study and practice split out, songs kept in play throughout.
- [x] **Eight hours** (selfcare). Week 1 at a four hour average after being
      unwell. Weekly average plus a five point feeling scale in the body.
- [x] **A book a week** (reading). Week 1 at zero, counting to 52. Points at
      the Library rather than duplicating it.
- [x] **The office plants** (houseplants). Month 1 of six. No number bar, one
      mark per monthly check-in. Needs the seven photographs, see section 5.
- [x] **Learning guitar**. Confirmed not real, deleted. The Music space had the
      name hard-coded in `app.js`; it now reads whichever journey is actually
      there. Stale mentions cleaned out of `why-i-made-noted`, `OBSIDIAN.md`
      and the `practice` topic description.
- [x] **A small kitchen garden (example)**. Seeded and publishing to the live
      site, deleted. If you want a real outdoor garden thread it should start
      from today rather than inherit fictional shoots.
- [ ] **Building Noted (example)** (`day-1-choose-...`, `day-7-put-content-...`).
      Seeded, already `publish: false`. Delete or write properly?

## 2. To-do list

- [x] Contact Amit at One Smile Dental. Marked done, 4 September 2026.
- [x] Contact HR about the Aviva health care rejection.
- [x] Follow up on the ADHD titration.
- [x] Order birthday gifts for Mum and Molly.
- [x] Water the plants: outdoor daily, indoor weekly.
- [x] Sort and clean the office.
- [x] Two walks a day with Martha.
- [x] Rest properly after the wisdom tooth removal.
- [x] Sort the Golf at Goodwood membership.
- [x] Follow up with Tim about the hearing aids.
- [ ] Due dates. Every new task went in undated, because inventing deadlines
      would have been fiction. Add `dueAt` to the ones that actually have one:
      the birthday gifts, the Goodwood membership, the titration follow up.
- [ ] The recurring ones (watering, the walks) sit oddly as one-off tasks that
      get ticked once. Decide whether they belong on the to-do list at all or
      only in their journeys.

## 3. House plants

- [x] Positions fixed. All seven now sit in the office, placed by how much
      light they get: nearest the glass door, mid room, back of the room.
- [ ] `lastWatered` is 4 September 2026 on all seven, so the rota currently
      orders them purely by cadence. Correct any that were watered earlier.
- [ ] `plant-*.jpg` in attachments: confirm whether these are photographs of
      your actual plants or stock. If stock, replace.
- [ ] `acquired` dates, `waterEvery` cadences and the care notes: check each
      against reality.

## 4. Journal

- [ ] `barcelona.md`, 4 images
- [ ] `school-starts.md`, 2 images
- [ ] `the-claw-machine.md`, 1 image
- [ ] `the-exhaust-and-the-tesla.md`, 3 images
- [ ] `the-first-mini.md`, 4 images
- [ ] `what-i-want-from-the-garden.md`, 4 images
- [ ] `first-open-source-contributions.md`, no images

Several already point at `attachments/IMG_*.jpeg`, which look like real
photographs off your phone. The ones under `assets/journal/` are the ones to
check: `dads-first-mini`, `first-mini-seafront`, `jazz-exhaust-break`,
`jazz-exhaust-roadside`, `jazz-on-the-lift`, `mini-garage-painting`,
`mini-garage-watercolour`.

## 5. Images to source

Every one of these is a generated or stock placeholder unless proven otherwise.

- [ ] Seven office plant photographs, for the month 1 baseline in **The office
      plants**. These are the blocker on that journey being worth anything.
- [ ] `assets/posts/`: codex-vs-claude, eight-japanese-principles,
      hyprland, interests, kitchen-garden, omarchy-setup, on-repeat,
      podcasts-worth-the-time, side-projects, slow-roast-tomato-focaccia,
      window-tiling, work-that-fits.
- [ ] `assets/books/`: meditations, the-anxious-generation,
      the-happiest-man-on-earth, tomorrow-and-tomorrow-and-tomorrow. Real cover
      art, or drop the `cover:` field and let the Library set a typographic
      plate instead.
- [ ] `assets/journal/`: the seven Mini and Jazz images listed above.
- [ ] Topic card photographs. Only `habits`, `music` and `food` carry one in
      `quartz/scripts/build-data.mjs`. Fourteen topics have an empty `photo:`.

## 6. Notes, books, quotes, recipes

- [ ] 11 notes. Which are yours and which were written to fill the layout?
      `why-i-made-noted` and `work-that-fits` read as real; the Omarchy,
      Hyprland, window tiling and Codex vs Claude pieces need a verdict.
- [ ] 4 books. Statuses and progress figures need checking against what you
      have actually read, especially now **A book a week** points at them.
- [ ] 4 quotes. Attributions worth confirming.
- [ ] 1 recipe, the focaccia. Real or seeded?
- [ ] `scraps/` is empty. Nothing to audit, but nothing on the Scraps board
      either.

## 7. Loose ends

- [x] The `practice` topic now reads "The instrument, and the hours it asks
      for". **Learning piano** is filed under `music`; move it to `practice`
      if you would rather it sat in its own sub-topic.
- [ ] `ED742637-A240-41B9-B6DB-876BA58FAC41.jpeg` sits loose in the repo root.
- [ ] `attachments/IMG_5936` exists as both `.jpeg` and `.png`.
