# Security Phase N2 — package shell / remote IPC

**Date:** 2026-07-16  
**Branch theme:** route privileged package Electron shell calls through main-process IPC.

## What shipped

### Main process (`register-renderer-ipc.js`)

| Channel | Behavior |
|---------|----------|
| `atom-shell-open-external` | Existing; scheme allowlist `http:` / `https:` / `mailto:` |
| `atom-shell-show-item-in-folder` | **New**; absolute path only → `shell.showItemInFolder` |
| `atom-shell-move-item-to-trash` | **New**; absolute path only → `shell.trashItem` (async; Electron 43 removed sync `moveItemToTrash`) |

### Renderer facade

- `renderer-ipc.js` + `ApplicationDelegate`: `showItemInFolder`, `moveItemToTrash` (Promise-returning).

### Package patches (`script/lib/patch-packages-remote-ipc.js`)

Applied on every `bootstrap-modern` (idempotent):

| Package | Change |
|---------|--------|
| **settings-view** | `shell.openExternal` → `atom.applicationDelegate.openExternal` |
| **tree-view** | `showItemInFolder` / trash via applicationDelegate; trash loop is async |
| **tree-view** DND | Drop `remote.BrowserWindow.fromId`; use `atom-webcontents-send-to-window-id` + `atom-get-current-window-id-sync` |
| **github** | Direct `shell.openExternal` sites → applicationDelegate (issueish / review / remotes) |

## Why

Packages previously called `electron.shell` in the preload/isolated world, bypassing the main-process scheme filter and using removed sync trash APIs. Cross-window tree-view DND used `remote` + `getCurrentWindow().id`, which is unreliable under the IPC window proxy.

## N2.1 — settings-view avatar cache (done 0.4.0)

Avatar images no longer use renderer `fs-plus` / `glob` under `userData`.

| Channel | Behavior |
|---------|----------|
| `atom-settings-view-cache-ensure` | `mkdir -p` `userData/Cache/settings-view`; returns root path |
| `atom-settings-view-cache-list` | basenames only (safe name filter) |
| `atom-settings-view-cache-write` | basename + buffer; max 5 MiB; path confined to cache root |
| `atom-settings-view-cache-unlink` | basename only; confined |

Patch: `script/lib/patch-packages-remote-ipc.js` rewrites `atom-io-client.coffee` (idempotent; marker `atom-settings-view-cache-ensure`).

## N2.2 — fuzzy-finder UI path probes (done post-0.4.0)

| Channel | Behavior |
|---------|----------|
| `atom-fs-path-kind-sync` | Absolute path → `lstat`; returns `file` / `directory` / `symlink` / `other` / `null` |
| `atom-fs-realpath-sync` | Absolute path → `realpathSync` or `null` |

Renderer: `applicationDelegate.isDirectorySync` / `isFileSync` / `isSymbolicLinkSync` / `realpathSync`.

Patches (`patch-packages-remote-ipc.js`):

| File | Change |
|------|--------|
| `fuzzy-finder-view.js` | `fs.isDirectorySync` → applicationDelegate |
| `git-status-view.js` | `fs.isFileSync` → applicationDelegate |
| `default-file-icons.js` | `fs.isSymbolicLinkSync` → applicationDelegate (extension helpers stay on fs-plus; pure string) |
| `path-loader.js` | `fs.realpathSync` on project roots → applicationDelegate |

**Still in Task process (by design, not UI):** `load-paths-handler.js` — recursive crawl + `child_process.spawn` of ripgrep. That is Atom `Task` isolation, not the editor preload package world.

## Deferred (later N2 / N3)

- tree-view bulk `fs-plus` for file ops UI (add/copy/move dialogs, directory listing)
- Full package require allowlist (N3)
- Moving Task crawl / rg spawn to main/utility process (large; optional later)

## Verify

```bash
# After bootstrap or re-run:
node script/lib/patch-packages-remote-ipc.js

# Smoke (packaged or dev):
node script/ci/smoke-test.js "out/Atom.app"   # or Atom Dev.app

# Manual:
# - Settings → package card / Learn more → opens https in browser (not file://)
# - Tree view → Show in Finder / Move to Trash
# - Drag project root between two Atom windows (if multi-window)
```

## Related

- Phase N overview: `docs/security-phase-n.md` (when present) / `docs/remote-ipc-inventory.md`
- IPC inventory: `docs/remote-ipc-inventory.md` §9
