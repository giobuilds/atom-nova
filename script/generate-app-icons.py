#!/usr/bin/env python3
"""Regenerate Chevron app icons with true transparent backgrounds.

No white/JPEG corner fringing — each size is drawn with an alpha-masked
rounded rect. Run from the repo root:

  python3 script/generate-app-icons.py

Requires: Pillow
Optional: ImageMagick `convert` for .icns (macOS packaging).
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw, ImageFilter
except ImportError:
    sys.stderr.write("Pillow required: pip install pillow\n")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1] / "resources"
SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
CHANNELS = {
    "stable": ((45, 30, 140), (0, 210, 230)),
    "beta": ((30, 60, 180), (40, 160, 255)),
    "nightly": ((90, 20, 140), (180, 80, 220)),
    "dev": ((20, 100, 70), (40, 200, 140)),
}


def rounded_rect_mask(size: int, radius: int, scale: int = 4) -> Image.Image:
    big = size * scale
    r = max(1, radius * scale)
    m = Image.new("L", (big, big), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, big - 1, big - 1], radius=r, fill=255)
    return m.resize((size, size), Image.Resampling.LANCZOS)


def linear_gradient(size: int, c0, c1) -> Image.Image:
    im = Image.new("RGB", (size, size))
    px = im.load()
    denom = max(1, (size - 1) * 2)
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            px[x, y] = (
                int(c0[0] + (c1[0] - c0[0]) * t),
                int(c0[1] + (c1[1] - c0[1]) * t),
                int(c0[2] + (c1[2] - c0[2]) * t),
            )
    return im


def chevron_paths(size: int):
    unit_paths = [
        [(4, 4), (22, 24), (4, 44), (12, 44), (30, 24), (12, 4)],
        [(26, 4), (44, 24), (26, 44), (34, 44), (52, 24), (34, 4)],
    ]
    max_x, max_y = 56.0, 48.0
    margin = 0.22
    usable = 1.0 - 2 * margin
    content_aspect = max_x / max_y
    if content_aspect > 1:
        w, h = usable, usable / content_aspect
    else:
        h, w = usable, usable * content_aspect
    ox, oy = (1 - w) / 2, (1 - h) / 2

    def map_pt(x, y):
        return ((ox + (x / max_x) * w) * size, (oy + (y / max_y) * h) * size)

    return [[map_pt(x, y) for x, y in path] for path in unit_paths]


def scrub_transparent(im: Image.Image, alpha_floor: int = 8) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < alpha_floor:
                px[x, y] = (0, 0, 0, 0)
            elif a < 255 and r > 250 and g > 250 and b > 250:
                px[x, y] = (0, 0, 0, 0)
    return im


def render_icon(size: int, c0, c1) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    radius = max(1, int(size * 0.22))
    mask = rounded_rect_mask(size, radius=radius)

    if size >= 64:
        shadow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 70))
        shadow_layer.putalpha(mask)
        off = max(1, size // 64)
        shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        shadow.paste(shadow_layer, (off, off), shadow_layer)
        shadow = shadow.filter(
            ImageFilter.GaussianBlur(radius=max(1, size // 48))
        )
        canvas = Image.alpha_composite(canvas, shadow)

    body = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    body.paste(linear_gradient(size, c0, c1), (0, 0))
    body.putalpha(mask)
    canvas = Image.alpha_composite(canvas, body)

    chev = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(chev)
    for poly in chevron_paths(size):
        draw.polygon(poly, fill=(255, 255, 255, 255))

    if size >= 128:
        sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d2 = ImageDraw.Draw(sh)
        for poly in chevron_paths(size):
            d2.polygon(poly, fill=(0, 0, 0, 50))
        off = max(1, size // 128)
        shifted = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        shifted.paste(sh, (off, off), sh)
        shifted = shifted.filter(
            ImageFilter.GaussianBlur(radius=max(1, size // 96))
        )
        shifted.putalpha(ImageChops.multiply(shifted.split()[3], mask))
        canvas = Image.alpha_composite(canvas, shifted)

    canvas = Image.alpha_composite(canvas, chev)
    return scrub_transparent(canvas)


def save_ico(path: Path, images_by_size: dict) -> None:
    sizes = [16, 24, 32, 48, 64, 128, 256]
    imgs = [images_by_size[s] for s in sizes if s in images_by_size]
    imgs[0].save(
        path,
        format="ICO",
        sizes=[(im.size[0], im.size[1]) for im in imgs],
        append_images=imgs[1:],
    )


def verify(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    corners = [
        im.getpixel(p)
        for p in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    ]
    if not all(c[3] == 0 for c in corners):
        raise SystemExit(f"{path}: corners not transparent: {corners}")
    cx = im.getpixel((w // 2, h // 2))
    if cx[3] < 200:
        raise SystemExit(f"{path}: center not opaque: {cx}")
    print(f"  OK {path} {w}x{h}")


def main() -> None:
    for channel, (c0, c1) in CHANNELS.items():
        print(f"=== {channel} ===")
        base = ROOT / "app-icons" / channel
        png_dir = base / "png"
        png_dir.mkdir(parents=True, exist_ok=True)
        by_size = {}
        for s in SIZES:
            im = render_icon(s, c0, c1)
            by_size[s] = im
            out = png_dir / f"{s}.png"
            im.save(out, format="PNG", optimize=True)
            verify(out)

        by_size[512].save(png_dir / "atom.png", format="PNG", optimize=True)
        by_size[1024].save(base / "chevron.png", format="PNG", optimize=True)
        by_size[1024].save(base / "atom.png", format="PNG", optimize=True)
        save_ico(base / "chevron.ico", by_size)
        save_ico(base / "atom.ico", by_size)

    stable = Image.open(ROOT / "app-icons" / "stable" / "png" / "1024.png")
    stable.save(ROOT / "brand" / "chevron-icon-1024.png", format="PNG", optimize=True)
    stable.save(ROOT / "brand" / "chevron-icon-source.png", format="PNG", optimize=True)
    print("Brand sources updated")

    if shutil.which("convert"):
        for channel in CHANNELS:
            base = ROOT / "app-icons" / channel
            src = base / "png" / "1024.png"
            for name in ("chevron.icns", "atom.icns"):
                dst = base / name
                try:
                    subprocess.run(
                        ["convert", str(src), str(dst)],
                        check=True,
                        capture_output=True,
                        timeout=60,
                    )
                    print(f"  icns {dst}")
                except Exception as exc:
                    print(f"  icns skip {dst}: {exc}")
    print("DONE")


if __name__ == "__main__":
    main()
