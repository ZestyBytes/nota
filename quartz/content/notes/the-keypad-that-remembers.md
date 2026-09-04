---
title: "The keypad that remembers what you played"
type: note
tags: [technology]
occurredAt: "2026-09-04"
createdAt: "2026-09-04"
publishedAt: "2026-09-04"
writing: true
publish: true
---

Interfaces mostly ask you to be efficient. Occasionally one asks you to enjoy
yourself instead, and that is worth stopping for. This one plays a note per
key, records what you press and plays it back, and it is put together well
enough that it feels like an object rather than a page.

https://codepen.io/jh3y/pen/WbQNxXb

The interesting part is not the sound, it is the physicality. Keys move on
press, they cast the shadow they should, and the depth is done in CSS rather
than in a picture of a keypad. Nothing here needs a games engine or a canvas:
it is elements, transforms and a little Web Audio, which is why it stays
crisp at any size and gets keyboard control almost for free.

Three things worth stealing from it:

- **Feedback on every input.** Press, sound and movement all land together,
  so the thing feels connected rather than reported on.
- **State you can see.** The recorder shows what it captured, so playback is
  never a surprise.
- **A small idea, finished properly.** It does one thing, and there is no
  half-built second thing behind it.

The shape of it is lifted from [Jhey Tompkins' keypad with a key recorder](https://codepen.io/jh3y/pen/WbQNxXb),
which does all of the above with considerably more polish. Worth pressing
every pad at least once before reading the source, which is the highest
praise a demo gets.
