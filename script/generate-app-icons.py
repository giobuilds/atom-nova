#!/usr/bin/env python3
"""Regenerate multi-size Chevron icons from high-quality 1024 masters.

Does NOT redraw the mark (that produces pixelated chevrons). Each channel's
png/1024.png is the design source; this script only downscales + writes
packager basenames (.png / .ico). Optional ImageMagick for .icns.

Usage (repo root):
  python3 script/generate-app-icons.py
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.stderr.write("Pillow required: pip install pillow\n")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1] / "resources"
SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
CHANNELS = ("stable", "beta", "nightly", "dev")


def scrub_near_zero_alpha(im: Image.Image, floor: int = 4) -> Image.Image:
    """Snap near-transparent fringe to fully transparent (keep design edges)."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < floor:
                px[x, y] = (0, 0, 0, 0)
    return im


def save_ico(path: Path, images_by_size: dict) -> None:
    sizes = [16, 24, 32, 48, 64, 128, 256]
    imgs = [images_by_size[s] for s in sizes if s in images_by_size]
    imgs[0].save(
        path,
        format="ICO",
        sizes=[(im.size[0], im.size[1]) for im in imgs],
        append_images=imgs[1:],
    )


def process_channel(channel: str) -> None:
    base = ROOT / "app-icons" / channel
    png_dir = base / "png"
    master_path = png_dir / "1024.png"
    if not master_path.exists():
        raise SystemExit(f"missing master {master_path}")

    master = scrub_near_zero_alpha(Image.open(master_path).convert("RGBA"))
    by_size = {1024: master}
    master.save(png_dir / "1024.png", format="PNG", optimize=True)

    for s in SIZES:
        if s == 1024:
            im = master
        else:
            im = scrub_near_zero_alpha(
                master.resize((s, s), Image.Resampling.LANCZOS)
            )
            by_size[s] = im
            im.save(png_dir / f"{s}.png", format="PNG", optimize=True)
        print(f"  {channel} {s}x{s}")

    by_size[512].save(png_dir / "atom.png", format="PNG", optimize=True)
    master.save(base / "chevron.png", format="PNG", optimize=True)
    master.save(base / "atom.png", format="PNG", optimize=True)
    save_ico(base / "chevron.ico", by_size)
    save_ico(base / "atom.ico", by_size)

    if shutil.which("convert"):
        for name in ("chevron.icns", "atom.icns"):
            dst = base / name
            try:
                subprocess.run(
                    ["convert", str(png_dir / "1024.png"), str(dst)],
                    check=True,
                    capture_output=True,
                    timeout=60,
                )
            except Exception as exc:
                print(f"  icns skip {dst}: {exc}")


def main() -> None:
    for channel in CHANNELS:
        print(f"=== {channel} ===")
        process_channel(channel)

    stable = Image.open(ROOT / "app-icons" / "stable" / "png" / "1024.png")
    stable.save(ROOT / "brand" / "chevron-icon-1024.png", format="PNG", optimize=True)
    stable.save(ROOT / "brand" / "chevron-icon-source.png", format="PNG", optimize=True)
    print("Brand sources updated")
    print("DONE — masters must remain design exports; this script only resizes.")


if __name__ == "__main__":
    main()
