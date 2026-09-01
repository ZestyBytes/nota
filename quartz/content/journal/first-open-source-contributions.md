---
title: Two plugins, live
type: journal
tags: [technology]
occurredAt: "2026-08-30"
createdAt: "2026-08-30"
publishedAt: "2026-08-30"
writing: true
publish: true
---

My first open source contributions are out in the world: two [Omarchy](https://omarchy.org)
plugins, both public, both MIT.

## Tapo Cameras

[omarchy-plugin-tapo](https://github.com/ZestyBytes/omarchy-plugin-tapo) puts a bar
icon on the desktop for the TP-Link Tapo cameras. Click it for a live preview of each
camera; click a preview and the full RTSP stream opens in `mpv`, tiled into the
workspace. There is a settings screen behind the cog for adding, editing, hiding and
testing cameras, so the config file never needs opening by hand.

```sh
omarchy plugin install https://github.com/ZestyBytes/omarchy-plugin-tapo
```

It is a `bar-widget`: one QML entry point doing both the icon and the popup.

```json
{
  "id": "io.github.zestybytes.tapo-cameras",
  "version": "1.1.0",
  "kinds": ["bar-widget"],
  "entryPoints": { "barWidget": "Panel.qml" }
}
```

## Deco Mesh

[omarchy-plugin-deco](https://github.com/ZestyBytes/omarchy-plugin-deco) does the same
job for the Deco mesh: every connected device grouped by the node it is on, live up and
down speed, notifications when something drops off, and the backhaul signal strength
where a node is hopping wirelessly rather than going straight to the main unit.

```sh
git clone https://github.com/ZestyBytes/omarchy-plugin-deco.git \
  ~/.config/omarchy/plugins/io.github.zestybytes.deco-mesh
omarchy plugin enable io.github.zestybytes.deco-mesh
omarchy bar put io.github.zestybytes.deco-mesh
```

The interesting half is `deco_status.py`, a headless helper that logs into the Deco's
local API: self-signed cert, RSA for the login, AES for everything after, all worked out
from prior community effort on the same API family. `Panel.qml` runs it on a sixty second
timer and renders whatever JSON comes back, so the QML never talks to the router itself.

## What I actually learned

Both plugins ended up being as much about restraint as features. The Deco one asks before
it installs a single Python dependency, into a local virtualenv, from pinned and
hash-verified versions. The Tapo one keeps camera credentials in a file it locks down
itself. Neither decision makes a screenshot look better, and both were the right call.
