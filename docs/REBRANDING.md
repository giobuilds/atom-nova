# AtomNova Rebranding Checklist

## 1. Core Identity Decisions

- [ ] Name: AtomNova (confirmed)
- [ ] Tagline (choose one or draft your own):
  - "The hackable text editor, reborn"
  - "Modern revival of the beloved Atom editor"
  - "Hackable. Fast. Yours."
  - "Atom's legacy, evolved for the 2020s"
- [ ] Description (for package.json, README, etc.):
  ``` AtomNova is a community-driven revival of the Atom text editor. We are modernizing the codebase while preserving its legendary hackability. ```
- [ ] Color Scheme (suggestion):
  - Primary: Deep blue/purple gradient (nova = new star)
  - Accent: Bright cyan or electric blue
  - Keep some Atom heritage (green accents optional)
- [ ] Logo/Icon Style: Modern atom/nova star fusion (glowing star + orbital paths)

## 2. Repository & Code Changes

- [ ] Rename the GitHub repository to `atomnova` (or `atom-nova`, `atomnova-editor`)
- [ ] Update these files:
  - `package.json` — `name`, `productName`, `description`, `repository`, `author`, `homepage`, `bugs`
  - `electron-builder.yml` or build config — appId, productName, copyright
  - `src/main-process/main.js` (or equivalent) — app name, window title
  - All strings containing "Atom" in UI, menus, and code (use find/replace carefully)
  - `README.md`, `CONTRIBUTING.md`, `docs/*`
  - Any config files (`config.json`, `keymaps`, etc.)
- [ ] Search the entire codebase for "atom" (case-insensitive) and decide what to keep (e.g., internal class names) vs replace.

## 3. Assets & Visuals

- [ ] App Icon (required sizes):
  - `.ico` (Windows), `.icns` (macOS), `.png` (Linux)
  - 1024x1024, 512x512, 256x256, etc.
- [ ] Logo variants:
  - Full logo with text "AtomNova"
  - Icon-only version
  - Dark/light mode versions
- [ ] Update splash screen / about dialog image
- [ ] Screenshots for README (plan to take fresh ones after updates)
- [ ] Favicon for any web-related components

## 4. Package Manager & Ecosystem

- [ ] Update package manager references (`apm` → `anpm` or keep compatible)
- [ ] Registry URL if you're hosting your own (initially point to Pulsar/Atom community repo for compatibility)
- [ ] Theme/package default names (e.g., `atom-nova-dark-ui`)

## 5. Legal & Community

- [ ] Update LICENSE file header if desired
- [ ] Add `NOTICE` or `CREDITS` mentioning original Atom and contributors
- [ ] Choose a domain (suggestions: `atomnova.dev`, `atomnova.app`, `getatomnova.dev`)
- [ ] Social handles (GitHub, X/Twitter, Discord, etc.) — claim early
