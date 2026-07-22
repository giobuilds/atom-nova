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

Prefer the checked-in generator (true transparent corners, no JPEG white fringe):

```bash
python3 script/generate-app-icons.py   # requires Pillow; optional ImageMagick for .icns
```

Do **not** reintroduce `chevron-icon-source.jpg` as the master — it is RGB-only with white corners. PNGs must keep alpha `0` outside the rounded mark.

## Linux taskbar note

Wayland shells often ignore `BrowserWindow` icons and use the installed
`.desktop` + hicolor theme entry (`Icon=chevron`). Install via the package or
`script` install path so `StartupWMClass=Chevron` matches.
