import { describe, expect, it } from 'vitest';
import { DRAGON_SPINE } from '@/components/sections/home/dragon/dragon-spine';
import { TAIL, bendTail, rigTail } from '@/components/sections/home/dragon/tail';

const S = DRAGON_SPINE;
function at(a: ArrayLike<number>, i: number): number {
  return a[i] ?? Number.NaN;
}
const N = S.x.length;
const REST_TIP_X = 239.63;

function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function segmentsIntersect(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number],
): boolean {
  const d1 = cross(p3[0], p3[1], p4[0], p4[1], p1[0], p1[1]);
  const d2 = cross(p3[0], p3[1], p4[0], p4[1], p2[0], p2[1]);
  const d3 = cross(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  const d4 = cross(p1[0], p1[1], p2[0], p2[1], p4[0], p4[1]);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

describe('tail forward kinematics', () => {
  it('keeps every segment length', () => {
    const rig = rigTail(S);
    for (const t of [0, 0.37, 1.1, 2.9]) {
      bendTail(rig, t);
      for (let j = 0; j < N - 1; j++) {
        const rest = Math.hypot(at(S.x, j + 1) - at(S.x, j), at(S.y, j + 1) - at(S.y, j));
        const bent = Math.hypot(at(rig.cx, j + 1) - at(rig.cx, j), at(rig.cy, j + 1) - at(rig.cy, j));
        expect(Math.abs(bent - rest)).toBeLessThan(1e-6);
      }
    }
  });

  it('keeps the base fixed', () => {
    const rig = rigTail(S);
    for (const t of [0, 1.7, 4.2]) {
      bendTail(rig, t);
      expect(at(rig.cx, 0)).toBeCloseTo(at(S.x, 0), 6);
      expect(at(rig.cy, 0)).toBeCloseTo(at(S.y, 0), 6);
    }
  });

  it('never folds over a full 6 s period', () => {
    const rig = rigTail(S);
    for (let step = 0; step * 0.05 <= 6 + 1e-9; step++) {
      bendTail(rig, step * 0.05);
      for (let a = 0; a < N - 1; a++) {
        for (let b = a + 2; b < N - 1; b++) {
          const hit = segmentsIntersect(
            [at(rig.cx, a), at(rig.cy, a)],
            [at(rig.cx, a + 1), at(rig.cy, a + 1)],
            [at(rig.cx, b), at(rig.cy, b)],
            [at(rig.cx, b + 1), at(rig.cy, b + 1)],
          );
          expect(hit, `segments ${a} and ${b} cross at t=${step * 0.05}`).toBe(false);
        }
      }
    }
  });

  it('swings the tip visibly', () => {
    const rig = rigTail(S);
    let max = -Infinity;
    let min = Infinity;
    for (let step = 0; step < 600; step++) {
      bendTail(rig, step * 0.01);
      const d = at(rig.cx, N - 1) - REST_TIP_X;
      max = Math.max(max, d);
      min = Math.min(min, d);
    }
    expect(Math.abs(max - 106.3)).toBeLessThanOrEqual(1);
    expect(Math.abs(min - -54.1)).toBeLessThanOrEqual(1);
  });

  it('writes the rest band into the UVs at every t', () => {
    const rig = rigTail(S);
    bendTail(rig, 0);
    const first = Float32Array.from(rig.verts);
    bendTail(rig, 1.3);
    const second = rig.verts;
    expect(second.length).toBe(N * 2 * 4);
    for (let j = 0; j < N; j++) {
      const hw = S.half - TAIL.taper * at(S.s, j);
      for (let side = 0; side < 2; side++) {
        const sg = side ? 1 : -1;
        const o = (j * 2 + side) * 4;
        const u = (at(S.x, j) + at(S.nx, j) * hw * sg) / S.w;
        const v = (at(S.y, j) + at(S.ny, j) * hw * sg) / S.h;
        expect(at(second, o + 2)).toBeCloseTo(u, 5);
        expect(at(second, o + 3)).toBeCloseTo(v, 5);
        expect(at(first, o + 2)).toBe(at(second, o + 2));
        expect(at(first, o + 3)).toBe(at(second, o + 3));
      }
    }
  });

  it('writes clip coordinates around the bent centre line', () => {
    const rig = rigTail(S);
    const verts = bendTail(rig, 0.8);
    expect(verts).toBe(rig.verts);
    for (let j = 0; j < N; j++) {
      const a = Math.max(0, j - 1);
      const b = Math.min(N - 1, j + 1);
      const tx = at(rig.cx, b) - at(rig.cx, a);
      const ty = at(rig.cy, b) - at(rig.cy, a);
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len;
      const ny = tx / len;
      const hw = S.half - TAIL.taper * at(S.s, j);
      for (let side = 0; side < 2; side++) {
        const sg = side ? 1 : -1;
        const o = (j * 2 + side) * 4;
        const px = at(rig.cx, j) + nx * hw * sg;
        const py = at(rig.cy, j) + ny * hw * sg;
        expect(at(verts, o)).toBeCloseTo(((px + TAIL.pad) / TAIL.canvasWidth) * 2 - 1, 5);
        expect(at(verts, o + 1)).toBeCloseTo(1 - ((py + TAIL.pad) / TAIL.canvasHeight) * 2, 5);
      }
    }
  });
});
