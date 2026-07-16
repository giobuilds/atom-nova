# Bootstrap Report

**Decision**: Stay on `atom/atom` base (do **not** re-base on Pulsar).  
**Date**: 2026-07-12  
**Final status**: **Bootstrap SUCCEEDED** (with manual env workarounds; stock `./script/bootstrap` alone is not enough on modern macOS)

Verified after clean `apm install` with correct env: critical natives present (`superstring`, `pathwatcher`, `git-utils`, `scrollbar-style`, `nslog`, `@atom/watcher`, `@atom/nsfw`, `@atom/fuzzy-native`).

---

## Working toolchain (use this)

> **T1 update (2026-07):** prefer **Python 3.12** + `pip install setuptools` (distutils). Python **3.11** remains a supported fallback. Host **Node stays 16** until Phase T2. See `docs/toolchain-node-python-upgrade-plan.md`.

| Item | Required value |
|------|----------------|
| Host | macOS 13.7.8 (x86_64), Apple clang 14.0.3, Command Line Tools |
| Node (host / scripts) | **16.20.2 via nvm** (not system Node 24) |
| Python | **3.12** preferred (`setuptools` required); **3.11** fallback — not 3.14 |
| Unversioned `python` | shim → selected interpreter (`modern-env` creates `~/.local/bin/python`) |
| C++ | set by `modern-env` from Electron major (`-std=c++17` / `gnu++20`) |
| Electron headers | `ATOM_ELECTRON_URL=https://www.electronjs.org/headers` |
| node-gyp patch | replace `open(..., 'rU')` → `'r'` in vendored gyp `input.py` |

### Shell recipe (reproducible)

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 16

# Prefer: source modern-env (selects Python 3.12 → 3.11, sets shim + CXXFLAGS)
#   . script/lib/modern-env.sh
# Manual fallback (3.12 example):
export PATH="$HOME/.local/bin:/usr/local/opt/python@3.12/libexec/bin:$PATH"
export PYTHON=/usr/local/bin/python3.12
export npm_config_python=/usr/local/bin/python3.12
export NODE_GYP_FORCE_PYTHON=/usr/local/bin/python3.12
# On 3.12+: python3.12 -m pip install setuptools

# atom.io electron download is dead (redirects to sunset blog)
export ATOM_ELECTRON_URL="https://www.electronjs.org/headers"
export ATOM_RESOURCE_PATH="$(pwd)"

# After script deps install, patch node-gyp before apm:
#   find script apm -path '*/node-gyp/gyp/pylib/gyp/input.py' \
#     -exec sed -i '' "s/'rU'/'r'/g" {} +
```

Install Python once: `brew install python@3.12 && python3.12 -m pip install setuptools`  
(or `brew install python@3.11`). Shim is created by `script/lib/modern-env.sh`.

---

## Attempt log

| # | Setup | Result | Failure |
|---|--------|--------|---------|
| 1 | Node **24.14.1**, Python **3.14.3** | **FAIL** | `script/` install: `fs-admin@0.12.0` NAN vs Node 24 V8 (`AccessorSignature`, etc.) |
| 2 | Node **16.20.2**, Python **3.14.3** | **FAIL** | `fs-admin`: `ModuleNotFoundError: No module named 'distutils'` (removed in Python 3.12+) |
| 3 | Node 16 + Python **3.11.15** | **FAIL** (advanced) | Script deps **OK**. apm: node-gyp `open(..., 'rU')` invalid on Py 3.11 |
| 4 | + gyp `rU`→`r` patch | **FAIL** (advanced) | `env: python: No such file or directory` building `oniguruma` |
| 5 | + `python` shim | **FAIL** (advanced) | `std::remove_cv_t` missing — need C++14 |
| 6 | + `CXXFLAGS=-std=c++14` | **FAIL** (advanced) | apm natives built for host Node 16 ABI; apm runs **bundled Node 12.14.1** (MODULE 72 vs 93) |
| 7 | apm install with `npm_config_target=12.14.1` | **Partial** | apm **runs** (`apm --version` OK). Postinstall rebuild of `oniguruma` still hit nested unpatched gyp |
| 8 | Root `apm install` default | **FAIL** | `--disturl=https://atom.io/download/electron` → sunset redirect / bad tarball for headers |
| 9 | `ATOM_ELECTRON_URL=https://www.electronjs.org/headers` | **SUCCESS** | `Installing modules ✓` |

---

## Pipeline status (after successful run)

| Step | Status |
|------|--------|
| 1. `verifyMachineRequirements` | Pass (gate is too loose — still allows Node 24 / Python 3.14) |
| 2. `installScriptDependencies` | Pass on Node 16 + Python 3.11 |
| 3. `installApm` | Pass with workarounds (C++14, python shim, gyp patch, Node 12 target) |
| 4. `apm --version` | Pass — apm 2.6.2 / node 12.14.1 / atom 1.65.0-dev |
| 5. Root `apm install` | Pass with `ATOM_ELECTRON_URL` |
| 6. Dependencies fingerprint | Written |

Verified present: `script/node_modules`, root `node_modules`, `@atom/fuzzy-native` native binary, apm operational.

---

## Root causes (by layer)

### 1. Host Node too new
Build scripts compile natives against **host** Node. Electron 11–era NAN/`fs-admin` does not build on Node 24.

### 2. Python too new
- **3.12+**: no stdlib `distutils` (node-gyp 5/9 need it)
- **3.11**: `distutils` OK but `open(..., 'rU')` removed → patch gyp
- Prefer **Python 3.11** + patch, or **≤3.10** without patch

### 3. No `python` binary
macOS/Homebrew only ship `python3`. Old `oniguruma` makefile calls `env python`.

### 4. Default C++ standard
Node 16 headers use `std::remove_cv_t` (C++14). Old node-gyp defaults break on modern clang without `-std=c++14`.

### 5. apm’s bundled Node 12
`atom-package-manager` embeds **Node 12.14.1**. Natives for apm must match that ABI (or be rebuilt by apm’s postinstall using its node). Building only with host Node 16 produces MODULE_VERSION mismatches.

### 6. Dead Electron header URL
Default:

```text
https://atom.io/download/electron  →  301 github.blog sunset Atom
```

Working replacement:

```text
https://www.electronjs.org/headers
→ https://artifacts.electronjs.org/headers/dist/v11.5.0/...
```

Set via **`ATOM_ELECTRON_URL`** (supported by apm).

---

## What stock `./script/bootstrap` still cannot do alone

Even with Node 16 on PATH, plain bootstrap will fail unless you also provide:

1. Python 3.11 (not 3.14) and a `python` shim  
2. `CXXFLAGS=-std=c++14`  
3. gyp `rU` patches after npm materializes node-gyp  
4. Careful apm install / ABI targeting  
5. `ATOM_ELECTRON_URL=https://www.electronjs.org/headers`  

**Recommended follow-up code changes** (Phase 1 engineering):

- Pin Node in `.nvmrc` (`16`) and tighten `verify-machine-requirements.js`  
- Document / set `ATOM_ELECTRON_URL` default away from atom.io  
- Patch or replace bundled node-gyp / vendor a bootstrap wrapper script  
- Add `python` discovery that accepts `python3`  
- Default `CXXFLAGS` for macOS in bootstrap  

---

## Wrappers (use these)

| Script | Purpose |
|--------|---------|
| `script/lib/modern-env.sh` | Shared env (Node 16, Python 3.12/3.11, Electron headers URL, gyp patch helper) |
| `script/with-modern-env` | Run any command with that env |
| `script/bootstrap-modern` | Full dependency install with patches / apm ABI targeting |

```bash
./script/bootstrap-modern
./script/with-modern-env ./script/build --no-bootstrap
```

## Build status (2026-07-12)

| Step | Result |
|------|--------|
| Transpile / package | **OK** — `out/Atom Dev.app` |
| Startup snapshot | **OK** after excluding `node:` builtins + `undici` / `encoding-sniffer` from electron-link (see `script/lib/generate-startup-snapshot.js`) |

App path: `out/Atom Dev.app`  
Launch: `open "out/Atom Dev.app"`

---

## Blank window (fixed 2026-07-12)

### Symptom
Packaged app opened a blank window. Dev mode (`--dev --resource-path=…`) progressed further.

### Error (packaged only)
```
Uncaught (in promise) TypeError: Cannot read property
  'node_modules/about/styles/about.less' of undefined
source: <embedded>
```

### Cause
Snapshot was re-generated in isolation after a failed full build, **without** re-running `prebuild-less-cache` in the same process.  
`CONFIG.snapshotAuxiliaryData` was therefore `{}`, so `lessSourcesByRelativeFilePath` was missing from the snapshot.  
`ThemeManager` assigned `undefined` and crashed on first style lookup.

### Fix
1. **Full rebuild** so less prebuild runs before snapshot:  
   `./script/with-modern-env ./script/build --no-bootstrap`
2. **Defensive fallbacks** in `src/theme-manager.js` if less maps are missing.
3. **`.catch(handleSetupError)`** on `setupWindow()` in `static/index.js` so init failures open DevTools.

### Rule
Never run `generateStartupSnapshot` alone in a fresh Node process. Always build via `script/build` (or re-run prebuild-less-cache first).

### Retest
No `about.less` / `TypeError`; natives load from asar.unpacked; metrics “Opt out reported.”

---

## Checklist mapping

| Migration item | Status after this work |
|----------------|------------------------|
| Node version for builds | **Wrapper pins Node 16** |
| Native modules / build tools | **Unblocked** via `bootstrap-modern` |
| apm backend | **Runs** with `ATOM_ELECTRON_URL` |
| Launch validation | **Packaged UI loads** after full rebuild + theme-manager harden |

---

*Last updated: 2026-07-12 — bootstrap, build, and blank-window fix.*
