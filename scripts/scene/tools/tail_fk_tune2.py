import json, math, sys
import numpy as np
sp = json.load(open(sys.argv[1]))
x, y, s = map(np.array, (sp["x"], sp["y"], sp["s"]))
seg = np.stack([np.diff(x), np.diff(y)], 1)
L = np.linalg.norm(seg, axis=1)
alpha = np.arctan2(seg[:, 1], seg[:, 0])
smid = (s[:-1] + s[1:]) / 2
def shape(t, TH, K, P, period):
    W = 2 * math.pi / period
    th = TH * smid ** P * (np.sin(t * W - smid * K) + .25 * np.sin(t * W * .5 + 1.3 - smid * K * .6))
    ang = alpha + th
    cx = np.concatenate([[x[0]], x[0] + np.cumsum(L * np.cos(ang))])
    cy = np.concatenate([[y[0]], y[0] + np.cumsum(L * np.sin(ang))])
    return cx, cy
print("old setting for reference: TH=.5 K=3.2 P=1.2 period 2.6")
for TH, K, P, per in [(.5, 3.2, 1.2, 2.6), (.9, 2.4, .9, 3.0), (1.0, 2.4, .9, 3.0), (1.1, 2.2, .9, 3.0), (1.2, 2.0, .8, 3.2)]:
    tips, minx, maxx, maxy, worst = [], 1e9, -1e9, -1e9, 1.0
    for t in np.linspace(0, 2 * per, 160):
        cx, cy = shape(t, TH, K, P, per)
        tips.append((cx[-1], cy[-1])); minx = min(minx, cx.min()); maxx = max(maxx, cx.max()); maxy = max(maxy, cy.max())
        d = np.stack([np.diff(cx), np.diff(cy)], 1)
        c = (d[1:] * d[:-1]).sum(1) / (np.linalg.norm(d[1:], axis=1) * np.linalg.norm(d[:-1], axis=1))
        worst = min(worst, c.min())
        # self-crossing check: distance between non-neighbour points
        P2 = np.stack([cx, cy], 1)
        D = np.linalg.norm(P2[:, None] - P2[None], axis=2)
        idx = np.arange(len(cx))
        far = np.abs(idx[:, None] - idx[None]) > 8
        worst_gap = D[far].min()
    tips = np.array(tips)
    print(f"TH={TH} K={K} P={P} per={per}: tip swing x {np.ptp(tips[:,0]):.0f}px y {np.ptp(tips[:,1]):.0f}px | "
          f"sharpest segment bend {math.degrees(math.acos(max(-1,min(1,worst)))):.0f} deg | min gap {worst_gap:.1f}px | "
          f"tail x {minx:.0f}..{maxx:.0f}, max y {maxy:.0f} (frame 800x706)")
