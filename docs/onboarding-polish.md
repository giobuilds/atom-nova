# First-run / onboarding polish

**Tracks:** README goal *Further first-run / onboarding polish*  
**Primary package:** `packages/welcome`  
**Related:** [REBRANDING.md](./REBRANDING.md), [CHANGELOG.md](../CHANGELOG.md) (0.3.0)

Use this file as a progress checklist. Check items when done; add notes under **Log** at the bottom.

---

## Definition of done (README box)

All of the following should be true before checking the README goal:

- [ ] No first-run path still *looks* like stock Atom sunset or Atom metrics consent without Chevron framing
- [ ] Welcome Guide CTAs match **what actually works** on Chevron today (or are clearly labeled limited/WIP)
- [ ] `docs/REBRANDING.md` open item **Optional first-run config migrate prompt** is done **or** explicitly WONTFIX with a one-line reason here
- [ ] Welcome-related tests match the real first-run flow
- [ ] Short note in CHANGELOG under Unreleased / next version

---

## Already done (0.3.0 baseline)

Do not re-do; listed so the remaining work is clear.

| Item | Where |
|------|--------|
| Chevron Welcome wordmark + tagline | `packages/welcome/lib/welcome-view.js` |
| Welcome body → repo + dual-support package API | same |
| Guide title / most cards say Chevron | `packages/welcome/lib/guide-view.js` |
| Startup: Welcome + Guide tabs | `packages/welcome/lib/welcome-package.js` |
| Startup: **no** Atom sunsetting auto-show | same |
| Telemetry consent forced off (no metrics upload) | same (`core.telemetryConsent` → `no`) |
| About + app icons brand mark | about package + `resources/app-icons/` |

---

## Workstream 1 — Dead / misleading surfaces

High value, mostly small cleanup.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| W1.1 | Rewrite or remove **sunsetting** view (`sunsetting-view.js`) | [ ] | Still “We are sunsetting Atom” + atom.io. Prefer: “You’re on Chevron (fork after Atom sunset)” **or** drop opener/menu and delete view |
| W1.2 | Rewrite or remove **consent** view (`consent-view.js`) | [ ] | Not shown on startup; still openable via `atom://welcome/consent`. Prefer: “Chevron does not collect telemetry” **or** remove opener |
| W1.3 | Align **welcome tests** with telemetry-always-off + no sunsetting auto-show | [ ] | `packages/welcome/test/welcome.test.js` still describes old consent-on-undecided flow |
| W1.4 | Clean **menus / docs / events** for removed surfaces | [ ] | `menus/welcome.cson`, `docs/events.md`, dead reporter events as needed |

**Suggested outcome for W1:** either Chevron-framed pages or zero user-facing path to Atom sunset/metrics UI.

---

## Workstream 2 — Guide honesty (what works today)

Highest dogfood UX impact.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| W2.1 | **Teletype** card | [ ] | “Install Teletype for Chevron” opens `atom://config/packages/teletype` — often a dead end. **Remove**, **relabel experimental**, or point to real install path if any |
| W2.2 | **Install a Package** card | [ ] | Settings installer + apm/registry limits. Copy should be honest until cpm; optional “install from path/git” hint |
| W2.3 | **Git / GitHub** cards | [ ] | Verify CTAs still work; tone down if integration is flaky |
| W2.4 | Init / stylesheet / snippets copy | [ ] | URIs stay `atom://.atom/…` (dual-home OK); optional note about `~/.atom` vs `~/.chevron` for power users |
| W2.5 | Help links | [ ] | Prefer living targets: `builtbygio/chevron`, build docs, architecture ELI5 — not atom.io / dead flight-manual as primary |

**Suggested outcome for W2:** every primary Guide button either works or is clearly marked limited/WIP.

---

## Workstream 3 — Dual-home first-run (REBRANDING open item)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| W3.1 | Design choice: prompt vs silent default | [ ] | Default today: `~/.atom` unless Chevron home exists |
| W3.2 | Optional first-run **config migrate / choose-home** UI | [ ] | e.g. “Use existing `~/.atom`, or start `~/.chevron`?” — from REBRANDING 0.3.0 polish list |
| W3.3 | Or **WONTFIX** with reason | [ ] | If silent dual-support is enough for now, document here and check REBRANDING item as cancelled |

---

## Workstream 4 — Product onboarding (optional “further”)

Nice-to-have; not all required to close the README goal if W1–W3 are solid.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| W4.1 | Single coherent first-run story | [ ] | Today: Welcome + Guide as two tabs; could unify or sequence better |
| W4.2 | “What works / what’s WIP” panel | [ ] | Electron 43 dogfood, multi-platform builds, packages limited until cpm — match README honesty |
| W4.3 | Empty-state / no-project first open | [ ] | Still feels like stock Atom without a folder |
| W4.4 | Shell command install nudge | [ ] | “Install `chevron` / `atom` / `apm` on PATH” (esp. macOS) |
| W4.5 | Startup defaults review | [ ] | `welcome.showOnStartup`; Guide every time vs once |

---

## Workstream 5 — Cleanup (low priority)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| W5.1 | Reporter / metrics event docs | [ ] | `reporter-proxy`, `docs/events.md` still describe GitHub analytics pipeline; no-op while metrics off |
| W5.2 | Dead code after W1 removals | [ ] | Unused views, config keys (`showSunsettingOnStartup`), deserializers |

---

## Out of scope (do not block this goal)

| Topic | Where it lives instead |
|-------|------------------------|
| cpm / apm successor | README “modern package manager path”; [cpm-design.md](./cpm-design.md) |
| Runtime package sandbox | Later platform / security work |
| VS Code–style walkthrough engine | Non-goal for now |

Onboarding **may mention** package limits; it does **not** need to implement cpm.

---

## Suggested implementation order

1. **W2** Guide honesty (Teletype + packages) — fastest user-facing win  
2. **W1** Sunsetting / consent rewrite or delete + tests  
3. **W3** Config-home prompt or WONTFIX  
4. **W4** only if time / product feel still weak  
5. **W5** cleanup pass  

---

## Key files

```text
packages/welcome/lib/welcome-package.js   # startup: what opens
packages/welcome/lib/welcome-view.js      # Welcome tab
packages/welcome/lib/guide-view.js        # Guide tab + CTAs
packages/welcome/lib/sunsetting-view.js   # legacy Atom sunset
packages/welcome/lib/consent-view.js      # legacy metrics consent
packages/welcome/test/welcome.test.js
packages/welcome/menus/welcome.cson
docs/REBRANDING.md                        # dual-home open item
README.md                                 # goal checkbox
```

---

## Log

| Date | Note |
|------|------|
| 2026-07-19 | Checklist created from post-0.3.0 gap analysis. Baseline polish already shipped; remaining work is honesty, dead Atom surfaces, optional migrate prompt. |
