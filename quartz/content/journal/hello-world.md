---
title: "Hello world"
type: journal
tags: [technology]
occurredAt: "2026-08-31"
createdAt: "2026-08-31"
publishedAt: "2026-08-31"
publish: true
---

![A phone resting on a wooden desk beside an open notebook and pen](https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1400)

Hello world. This is the first entry written entirely from my phone, standing up, with no laptop anywhere nearby — which was rather the point of building the thing this way.

The mechanics are pleasingly boring. A note goes into the vault with `publish: true` in its frontmatter, the push to `main` kicks off the Actions workflow, `build-data.mjs` rebuilds `data.js` from every published note, and the site redeploys. Thirty or forty seconds, start to finish. There is no editor on the site, no database behind it, no button anywhere that makes something public — a Git push *is* publishing, and nothing else is.

That constraint is the feature. It means the private half of the vault stays private by default rather than by vigilance, and it means the archive is only ever as complicated as a folder of Markdown files. Writing from a phone doesn't change any of that; it just removes the last excuse not to write something down on the day it happened.

Worth remembering for next time: get the frontmatter right first and the prose second. `type` and `tags` decide whether an entry appears at all and where it lands, and they're much easier to fix before the push than after.

Related: [[Technology]]
