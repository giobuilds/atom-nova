# Security Phase N3 — preload privilege map + guest content

**Date:** 2026-07-16  
**Depends on:** Phase I (contextIsolation + preload boot), Phase N2 (package shell IPC when merged).

## Goal

Make the **privilege boundaries explicit** and **lock down guest content**, without yet removing Node from the Atom preload (that is a multi-month N3→N5 arc).

## Privilege map (current)

| Realm | Node | Isolation | Sandbox | Role |
|-------|------|-----------|---------|------|
| Main process | Yes | n/a | n/a | Windows, IPC trust boundary |
| Editor **page** world | **No** | yes | n/a (same process) | Empty HTML shell / custom elements |
| Editor **preload** world | **Yes** | yes | **false** (needs natives) | Boots Atom + packages |
| Guest **`<webview>`** | **No** (forced) | **yes** (forced) | **true** (forced) | Untrusted embed; attrs cannot re-enable Node |
| GitHub worker `BrowserWindow` | Yes | **false** | false | Trusted hidden git workers (exception) |

### Why editor `sandbox: false`

Preload loads native addons (non-exhaustive):

- `superstring` (text buffer)
- `pathwatcher` / `@atom/watcher`
- `tree-sitter` + language grammars
- `oniguruma` (TextMate modes)
- package natives (`keytar`, etc.)

Electron’s sandboxed preload cannot `require()` arbitrary `.node` binaries the way Atom expects. Full sandbox for the editor window is **Phase S / later N**, after natives move or a package host splits.

### Preload “default deny” policy (product)

1. **Do not** add new privileges to the page world.
2. **Do not** expose the Atom preload as a guest webview preload.
3. **New packages** should assume no Node long-term; use `atom.*` / IPC.
4. **Bundled packages** still run with Node in preload today (T1); reduce over N2–N4.
5. **window.open** from the renderer is **denied**; open windows via main IPC.

## What shipped in code

### `AtomWindow` (`src/main-process/atom-window.js`)

1. **`will-attach-webview`** — overwrites guest `webPreferences`:
   - no `preload` / `preloadURL`
   - `nodeIntegration` / workers / subframes **false**
   - `contextIsolation: true`, `sandbox: true`
   - `webSecurity: true`, no insecure content / experimental flags
2. **`setWindowOpenHandler` → deny** — blocks `window.open` / `target=_blank` child BrowserWindows from the renderer (logs a warning).

### `static/preload.js`

Documents the privilege map and points here.

## Audit notes (2026-07-16)

- No first-party bundled package in the default set was found creating `<webview>` elements; `webviewTag: true` remains for compatibility with community packages, with guest lockdown above.
- No first-party `window.open` call sites found in core/default packages; deny is low risk.
- `nodeIntegrationInWorker: true` kept for package/Web Worker `require` until audited off.

## Not in this phase

- Removing Node from preload / package host allowlist (hard; later N3–N4)
- `sandbox: true` on the main editor window
- Replacing GitHub worker BrowserWindows with utility process
- fuzzy-finder crawl service (N2 deferred)

## Verify

```bash
node --check src/main-process/atom-window.js
# Smoke after build:
node script/ci/smoke-test.js "out/Atom.app"
```

Manual / CDP (optional):

- From isolated world, `window.open('https://example.com')` should not create a BrowserWindow (denied).
- If a package inserts `<webview>`, guest should not have `require` / Node.

## Related

- `docs/security-phase-n2.md` — package shell IPC  
- `docs/remote-ipc-inventory.md` — historical remote kill list  
- `docs/security-phase-n.md` — full Phase N plan (when present on branch)
