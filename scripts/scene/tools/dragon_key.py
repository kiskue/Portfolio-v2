"""Cut the dragon frames out of their green background.

Usage: python -I dragon_key.py <ffmpeg> <out_dir> <name=path> [<name=path> ...]

For each frame: decode with ffmpeg, build a soft alpha matte from how green each pixel is,
remove green spill from the edges, then crop every frame to the same union box (so the body
stays in exactly the same place between frames) and write a transparent PNG and WebP.
"""
import os
import subprocess
import sys

import numpy as np

ff, out_dir, *specs = sys.argv[1:]
SIZE = 1024
OUT_W = int(os.environ.get("DRAGON_W", "560"))
LO, HI = 25.0, 110.0  # greenness where alpha starts to fall / reaches zero

frames = {}
for spec in specs:
    name, path = spec.split("=", 1)
    raw = subprocess.run(
        [ff, "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True,
    ).stdout
    frames[name] = np.frombuffer(raw, np.uint8).reshape(SIZE, SIZE, 3).astype(np.float32)

border = np.concatenate([np.concatenate([f[:8].reshape(-1, 3), f[-8:].reshape(-1, 3), f[:, :8].reshape(-1, 3), f[:, -8:].reshape(-1, 3)]) for f in frames.values()])
print("background median RGB:", np.median(border, axis=0).round())

keyed = {}
union = np.zeros((SIZE, SIZE), bool)
for name, img in frames.items():
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    greenness = g - np.maximum(r, b)
    alpha = np.clip(1.0 - (greenness - LO) / (HI - LO), 0.0, 1.0)
    g2 = np.minimum(g, np.maximum(r, b))  # despill: green never exceeds the larger of red/blue
    rgba = np.dstack([r, g2, b, alpha * 255.0]).round().clip(0, 255).astype(np.uint8)
    keyed[name] = rgba
    union |= alpha > 0.06
    print(f"{name}: opaque pixels {int((alpha > 0.5).sum())}")

ys, xs = np.where(union)
pad = 10
y0, y1 = max(0, ys.min() - pad), min(SIZE, ys.max() + pad + 1)
x0, x1 = max(0, xs.min() - pad), min(SIZE, xs.max() + pad + 1)
w, h = x1 - x0, y1 - y0
print(f"union crop: x {x0}-{x1}, y {y0}-{y1} ({w}x{h})")

os.makedirs(out_dir, exist_ok=True)
for name, rgba in keyed.items():
    crop = np.ascontiguousarray(rgba[y0:y1, x0:x1])
    for ext, codec in (("png", ["-c:v", "png"]), ("webp", ["-c:v", "libwebp", "-quality", "86", "-pix_fmt", "yuva420p"])):
        subprocess.run(
            [ff, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}", "-i", "-",
             "-vf", f"scale={OUT_W}:-1:flags=lanczos", *codec, "-frames:v", "1", os.path.join(out_dir, f"dragon-{name}.{ext}")],
            input=crop.tobytes(), check=True,
        )
for f in sorted(os.listdir(out_dir)):
    print(f, os.path.getsize(os.path.join(out_dir, f)) // 1024, "KB")
