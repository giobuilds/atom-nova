# Chevron brand assets

## App icon

Source of truth for packaged icons:

```text
resources/app-icons/<channel>/
  chevron.icns   # macOS
  chevron.ico    # Windows
  png/16.png … 1024.png
  atom.icns / atom.ico   # compatibility copies of the same art
```

Channels: `stable`, `beta`, `nightly`, `dev` (tinted variants).

Packaging prefers the **`chevron`** basename (`package-application` icon path, Windows setup icon, `CFBundleIconFile`).

## Mark

The mark is a **double chevron** (`>>`) on an indigo→cyan gradient rounded square — not the Atom orbital.

In-app SVG wordmarks live in:

- `packages/about/lib/components/chevron-logo.js`
- `packages/welcome/lib/welcome-view.js` (inline SVG)

## Regenerating icons

Master raster (session or design export) → resize with Pillow + `iconutil` (see CI notes / local script). Prefer updating `png/1024.png` then rebuilding `.icns`/`.ico` rather than hand-editing each size.
