# How Chevron works (architecture)

**Audience:** developers studying or modifying the editor  
**Product:** Chevron — a modernized fork of Atom  
**Runtime:** Electron 43 (Chromium + Node ~24 in-app)

Chevron is a desktop text editor built on **Electron**, with Atom’s package-based UI and a multi-process security model that has been tightened over several phases (remote removal, contextIsolation, guest lockdown).

---

## One-sentence model

**Main process** owns windows, OS, and trusted IPC.  
**Each editor window** boots Atom in a **preload isolated world** (Node + packages).  
The **page world** is a thin shell without Node.  
**Packages** plug into Atom APIs and extend the workspace.

---

## High-level stack

```text
┌─────────────────────────────────────────────────────────────┐
│  Electron 43  (Chromium + Node ~24 in-app)                    │
├─────────────────────────────────────────────────────────────┤
│  Main process                                                 │
│  src/main-process/main.js → start.js → AtomApplication        │
│  • windows, menus, dialogs, shell, auto-update                │
│  • register-renderer-ipc (trusted handlers)                   │
├─────────────────────────────────────────────────────────────┤
│  Renderer (editor BrowserWindow)                              │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │ Preload / isolated    │  │ Page world                   │  │
│  │ contextIsolation=true │  │ nodeIntegration=false        │  │
│  │ Node YES              │  │ Node NO                      │  │
│  │ boots Atom + packages │  │ empty shell / custom els     │  │
│  │ global `atom` lives   │  │                              │  │
│  │ HERE                  │  │                              │  │
│  └──────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Packages (tree-view, git-diff, github, welcome, …)           │
│  Natives (.node): superstring, pathwatcher, tree-sitter, …   │
└─────────────────────────────────────────────────────────────┘
```

---

## Process model

### 1. Main process (Node, privileged)

Entry: `package.json` → `src/main-process/main.js` → `start.js`.

Responsibilities:

- Parse CLI, choose `resourcePath` (packaged asar vs dev repo)
- Create `AtomApplication` / `AtomWindow` (BrowserWindows)
- App menus, dialogs, `shell.openExternal`, protocol handlers
- **IPC hub** (`register-renderer-ipc.js`) — trusted operations only
- Spawn helper processes / workers (e.g. github-related)

This is the only place that should talk freely to the OS for sensitive work.

### 2. Editor window (renderer)

Created in `atom-window.js` with roughly:

| Preference | Value | Meaning |
|------------|--------|---------|
| `nodeIntegration` | `false` | Page JS cannot use Node |
| `contextIsolation` | `true` | Preload and page are separate JS worlds |
| `preload` | `static/preload.js` | Boots the editor |
| `sandbox` | `false` | Preload can load native modules |

**Important:** `window.atom` is **not** on the page. It lives in the **Electron Isolated Context** (preload). That’s why CDP debugging must target that context, not “main world.”

### 3. Guest webviews / workers

- **Guest webviews** (untrusted HTML): locked down — no Node, sandboxed prefs forced on attach (Phase N3).
- **GitHub worker windows**: still more privileged (`nodeIntegration` + no isolation) via a fixed main-process allowlist — transitional, documented under Phase N.

---

## Boot sequence (editor window)

```text
1. Main creates BrowserWindow + loads static HTML
2. static/preload.js runs in isolated world with Node
3. static/index.js sets up remote-compat (no electron.remote)
4. initialize-application-window.js builds AtomEnvironment
5. atom.packages loads themes + packages
6. Workspace UI mounts: panes, docks, editors, status bar
7. Optional: welcome tabs, project paths from CLI, restore state
```

Packaged builds may use a **V8 startup snapshot** (`snapshotResult`) to skip re-parsing a lot of JS. If snapshot generation fails, the app still runs, just with a slower cold start.

---

## Core runtime objects (the “Atom API”)

Once booted, packages and core talk through a global-ish **`atom` environment** (`AtomEnvironment` in `atom-environment.js`):

| Object | Role |
|--------|------|
| `atom.workspace` | Center + docks, open items, panes, panels |
| `atom.project` | Roots, buffers, path watching, find-in-project |
| `atom.packages` | Activate/deactivate packages |
| `atom.commands` | Keymap-bound commands |
| `atom.config` | Settings (cson / schema) |
| `atom.grammars` / language modes | TextMate + tree-sitter highlighting |
| `atom.styles` / `atom.themes` | LESS/CSS UI & syntax themes |
| `atom.git` / repositories | Repo status (git-diff, github package) |
| `atom.notifications` | Toasts / errors |

### Workspace layout

```text
atom-workspace
├── center (WorkspaceCenter) — editors, welcome, settings, etc.
│   └── panes (split tabs)
├── left dock  — e.g. tree-view “Project”
├── right dock — e.g. github / git tabs
└── bottom dock — e.g. find results
```

**Items** are model objects (TextEditor, GuideView, …) with optional `getTitle` / `getURI` / `destroy`.  
**Views** are DOM elements registered via `ViewRegistry` (and custom elements under isolation).

### Text editing stack

```text
TextBuffer (text-buffer package)
    └── TextEditor (model)
            └── TextEditorComponent (DOM / layers / decorations)
                    └── markers + decorations (git-diff gutters, etc.)
```

Language modes: classic **TextMate** grammars and **tree-sitter** for modern parsing.  
Natives (superstring, etc.) power fast text ops.

---

## Packages

Packages are first-class:

- **Bundled** — listed in root `package.json` (`file:packages/...` or git pins)
- **Community** — installed under `~/.atom/packages` via apm (aspirationally API-only, no Node)

Lifecycle: `activate` → optional services (`provide*` / `consume*`) → `deactivate`.

Examples:

- **tree-view** — project file tree  
- **git-diff** — gutter markers from repo line diffs  
- **github** — Git/GitHub UI + hidden workers  
- **welcome** — startup Welcome / Guide tabs  
- **tabs**, **status-bar**, **settings-view**, language packs, themes  

Build/bootstrap still uses **apm** (bundled Node 12) for installs; **host** Node (22/24) runs scripts and modern node-gyp for Electron ABI rebuilds. Those are toolchain layers, not the running editor’s Node.

---

## IPC and “remote” (security model)

Classic Atom used `electron.remote` so renderers called main APIs as if local. Chevron removed that.

Replacement layers:

1. **`src/remote-compat.js`** — temporary bridge for leftover package code  
2. **`renderer-ipc` / `application-delegate`** — preferred Atom-facing APIs  
3. **`register-renderer-ipc.js`** — main-side allowlisted handlers (shell, dialogs, BrowserWindow for workers, etc.)

Privilege map (from security docs):

| Realm | Node? | Role |
|-------|-------|------|
| Main | Yes | OS + IPC |
| Editor preload | Yes | Atom + packages |
| Editor page | No | Shell DOM |
| Guest webview | No | Untrusted content |
| GitHub workers | Yes (legacy) | Hidden git work |

See also: `docs/security-phase-n.md`, `docs/remote-ipc-inventory.md`.

---

## Build vs run

| Concern | What |
|---------|------|
| **Host toolchain** | Node 20–24 + Python 3.12 for bootstrap/build |
| **apm install** | Bundled Node **12** for package manager |
| **App runtime** | Electron **43** (in-process Node ~24) |
| **Package** | `script/build` → `out/Atom.app` + `app.asar` |
| **Natives** | Rebuilt for Electron ABI; some unpacked from asar |

Dev path:

```bash
nvm use
./script/bootstrap-modern
./script/with-modern-env ./script/build --no-bootstrap
open out/Atom.app
```

See also: `docs/toolchain-node-python-upgrade-plan.md`, `docs/bootstrap-report.md`.

---

## Mental model for debugging

1. **UI not updating / `atom` missing in console** → you’re in page world; need isolated context.  
2. **Native crash / MODULE_VERSION** → ABI mismatch (host vs apm vs Electron rebuild).  
3. **Package throws on close** → lifecycle race (markers, rAF) in preload world, not main.  
4. **Shell / open external / dialogs** → should go main IPC, not raw Electron from packages.  
5. **Blank window** → often snapshot/theme/less cache or isolation boot issues, not “Electron is broken.”

---

## Design intent (where Chevron is going)

- Keep Atom’s **hackable package platform**  
- Keep **Electron** as the runtime  
- Move privilege **up into main** and **out of packages**  
- Shrink Node in package contexts over time (Phase N)  
- Guests never get Node  

---

## Key source map (where to look)

| Area | Paths |
|------|--------|
| Main entry | `src/main-process/main.js`, `start.js`, `atom-application.js`, `atom-window.js` |
| Preload boot | `static/preload.js`, `static/index.js` |
| Atom core | `src/atom-environment.js`, `src/workspace.js`, `src/project.js` |
| Editors | `src/text-editor.js`, `src/text-editor-component.js` |
| Packages | `src/package-manager.js`, `src/package.js`, `packages/*`, root `package.json` |
| IPC / remote | `src/remote-compat.js`, `src/renderer-ipc.js`, `src/main-process/register-renderer-ipc.js` |
| Build | `script/bootstrap-modern`, `script/build`, `script/lib/modern-env.sh` |

---

## Companion doc

A non-technical walkthrough of the same ideas lives in:

**`docs/atom-architecture-eli5.md`**

---

*Saved for handoff and personal study. Edit freely; this is not an RFC.*
