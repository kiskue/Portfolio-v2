"""Split the rear-view dragon into a body (no tail) and a separate tail layer that can bend.

Usage: python -I tail_layer.py <ffmpeg> <frames_dir> <out_dir>

Writes:
  rear-body-up/level/down.webp  the three wing frames with the tail removed past its base
  rear-tailtex.webp             the tail alone (from the wings-up frame), fading in at its base
  rear-spine.json               the tail's centre line (x, y, normal, s) for the bending mesh
The tail is identical in all three frames (within ~2 px), so one tail layer serves them all.
Near the base the body keeps the tail and the tail layer fades in, so the join never shows.
"""
import json
import math
import os
import subprocess
import sys

import numpy as np

ff, frames_dir, out_dir = sys.argv[1:]
W, H = 800, 706
X0, Y0, S = 10, 66, 800 / 1006
HALF = 30.0          # half-width of the tail band (texture px); the tail itself is at most ~16
CUT0, CUT1 = 0.04, 0.11   # cross-fade between body and tail layer along s

def load(name):
    raw = subprocess.run([ff, "-v", "error", "-i", f"{frames_dir}/dragon-{name}.png", "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 4).astype(np.float32)

frames = {n: load(n) for n in ("up", "level", "down")}
alpha = frames["up"][..., 3] / 255

# --- centre line: same tracing as tail_spine.py ---
rough = [(595, 700), (588, 730), (570, 760), (545, 785), (510, 808), (470, 828), (430, 846), (395, 862),
         (365, 878), (340, 895), (325, 912), (315, 930), (311, 945)]
pts = np.array([((x - X0) * S, (y - Y0) * S) for x, y in rough], np.float32)

def normals_of(p):
    t = np.gradient(p, axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True)
    return np.stack([-t[:, 1], t[:, 0]], axis=1)

for _ in range(2):
    nrm = normals_of(pts)
    for i, (p, n) in enumerate(zip(pts, nrm)):
        offs = np.arange(-30, 30.5, 0.5)
        xs = np.clip((p[0] + offs * n[0]).round().astype(int), 0, W - 1)
        ys = np.clip((p[1] + offs * n[1]).round().astype(int), 0, H - 1)
        on = alpha[ys, xs] > 0.5
        if not on.any():
            continue
        idx = np.where(on)[0]
        runs = np.split(idx, np.where(np.diff(idx) > 1)[0] + 1)
        c = len(offs) // 2
        best = min(runs, key=lambda r: 0 if r[0] <= c <= r[-1] else min(abs(r[0] - c), abs(r[-1] - c)))
        pts[i] = p + n * offs[(best[0] + best[-1]) // 2]

# extend a hair past the tip so the very end is inside the mesh, but never past the picture's
# edge: the tip sits ~7px above the bottom, and sampling beyond the edge repeats the last row.
tip_dir = pts[-1] - pts[-2]
tip_dir /= np.linalg.norm(tip_dir)
ext = pts[-1] + tip_dir * 4
ext[1] = min(ext[1], H - 2.0)
pts = np.vstack([pts, ext])

seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
cum = np.concatenate([[0], np.cumsum(seg)])
total = cum[-1]
u = np.linspace(0, total, 90)
pts = np.stack([np.interp(u, cum, pts[:, 0]), np.interp(u, cum, pts[:, 1])], axis=1)
nrm = normals_of(pts)
seglen = np.linalg.norm(np.diff(pts, axis=0), axis=1)
cum = np.concatenate([[0], np.cumsum(seglen)])

# --- per-pixel nearest point on the centre line ---
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
best_d2 = np.full((H, W), np.inf, np.float32)
best_s = np.zeros((H, W), np.float32)
before_base = np.zeros((H, W), bool)
for i in range(len(pts) - 1):
    a, b = pts[i], pts[i + 1]
    ab = b - a
    traw = ((xx - a[0]) * ab[0] + (yy - a[1]) * ab[1]) / float(ab @ ab)
    t = np.clip(traw, 0, 1)
    d2 = (xx - (a[0] + t * ab[0])) ** 2 + (yy - (a[1] + t * ab[1])) ** 2
    better = d2 < best_d2
    best_d2 = np.where(better, d2, best_d2)
    best_s = np.where(better, (cum[i] + t * seglen[i]) / total, best_s)
    before_base = np.where(better, (i == 0) & (traw < 0), before_base)

dist = np.sqrt(best_d2)
in_band = (dist < HALF) & ~before_base
x = np.clip((best_s - CUT0) / (CUT1 - CUT0), 0, 1)
ramp = np.where(in_band, x * x * (3 - 2 * x), 0.0)        # 0 = stays on the body, 1 = belongs to the tail layer

def encode(rgba, path):
    subprocess.run([ff, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-i", "-",
                    "-c:v", "libwebp", "-quality", "88", "-pix_fmt", "yuva420p", "-frames:v", "1", path],
                   input=np.ascontiguousarray(rgba.round().clip(0, 255).astype(np.uint8)).tobytes(), check=True)

os.makedirs(out_dir, exist_ok=True)
for n, f in frames.items():
    body = f.copy()
    body[..., 3] *= (1 - ramp)
    encode(body, os.path.join(out_dir, f"rear-body-{n}.webp"))
tail = frames["up"].copy()
tail[..., 3] *= ramp
encode(tail, os.path.join(out_dir, "rear-tailtex.webp"))
print("tail layer opaque pixels:", int((tail[..., 3] > 128).sum()), "| body pixels moved to the tail layer:", int((ramp > .5).sum()))

spine = {
    "w": W, "h": H, "half": HALF,
    "x": [round(float(v), 2) for v in pts[:, 0]], "y": [round(float(v), 2) for v in pts[:, 1]],
    "nx": [round(float(v), 4) for v in nrm[:, 0]], "ny": [round(float(v), 4) for v in nrm[:, 1]],
    "s": [round(float(v), 4) for v in (cum / total)],
}
with open(os.path.join(out_dir, "rear-spine.json"), "w") as fh:
    json.dump(spine, fh)
print(f"spine: {len(pts)} points, length {total:.1f}px, base ({pts[0][0]:.0f},{pts[0][1]:.0f}) tip ({pts[-1][0]:.0f},{pts[-1][1]:.0f})")
for f in sorted(os.listdir(out_dir)):
    print(f, os.path.getsize(os.path.join(out_dir, f)) // 1024, "KB")
