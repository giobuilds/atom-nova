# Chevron brand assets

## App icon

Source of truth for packaged icons:

```text
resources/app-icons/<channel>/
  chevron.icns / chevron.ico / chevron.png   # packager basenames (mac / win / linux)
  atom.icns / atom.ico / atom.png            # compatibility copies of the same art
  png/16.png … 1024.png / atom.png           # freedesktop sizes + legacy name
```

Channels: `stable`, `beta`, `nightly`, `dev` (tinted variants).

Packaging prefers the **`chevron`** basename (`package-application` icon path, Windows setup icon, `CFBundleIconFile`). Linux **requires** `chevron.png` next to that basename (electron-packager does not read `png/1024.png` automatically).

## Mark

The mark is a **double chevron** (`>>`) on an indigo→cyan gradient rounded square — not the Atom orbital.

In-app SVG wordmarks live in:

- `packages/about/lib/components/chevron-logo.js`
- `packages/welcome/lib/welcome-view.js` (inline SVG)

## Regenerating icons

Master raster (session or design export) → resize with Pillow + `iconutil` (see CI notes / local script). Prefer updating `png/1024.png` then rebuilding `.icns`/`.ico` rather than hand-editing each size.
