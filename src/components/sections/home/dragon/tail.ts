/** Indexed read that satisfies noUncheckedIndexedAccess without allocating. */
function at(a: ArrayLike<number>, i: number): number {
  return a[i] ?? 0;
}

export interface Spine {
  readonly w: number;
  readonly h: number;
  readonly half: number;
  readonly x: readonly number[];
  readonly y: readonly number[];
  readonly nx: readonly number[];
  readonly ny: readonly number[];
  readonly s: readonly number[];
}

export const TAIL = {
  amplitude: 0.9,
  power: 0.9,
  omega: (2 * Math.PI) / 3,
  k: 2.4,
  taper: 18,
  pad: 100,
  canvasWidth: 1000,
  canvasHeight: 906,
} as const;

export interface TailRig {
  readonly spine: Spine;
  readonly verts: Float32Array;
  readonly cx: Float64Array;
  readonly cy: Float64Array;
}

interface InternalRig extends TailRig {
  readonly segL: Float64Array;
  readonly segA: Float64Array;
  readonly segS: Float64Array;
}

export function rigTail(spine: Spine): TailRig {
  const n = spine.x.length;
  const segL = new Float64Array(n - 1);
  const segA = new Float64Array(n - 1);
  const segS = new Float64Array(n - 1);
  for (let j = 0; j < n - 1; j++) {
    const ex = at(spine.x, j + 1) - at(spine.x, j);
    const ey = at(spine.y, j + 1) - at(spine.y, j);
    segL[j] = Math.hypot(ex, ey);
    segA[j] = Math.atan2(ey, ex);
    segS[j] = (at(spine.s, j) + at(spine.s, j + 1)) / 2;
  }
  const rig: InternalRig = {
    spine,
    verts: new Float32Array(n * 2 * 4),
    cx: new Float64Array(n),
    cy: new Float64Array(n),
    segL,
    segA,
    segS,
  };
  return rig;
}

/** Bends the tail like a chain of bones, then writes the ribbon (`[clipX, clipY, u, v]` per vertex). */
export function bendTail(rig: TailRig, t: number): Float32Array {
  const { spine, verts, cx, cy } = rig;
  const { segL, segA, segS } = rig as InternalRig;
  const n = spine.x.length;
  const { amplitude, power, omega, k, taper, pad, canvasWidth, canvasHeight } = TAIL;

  cx[0] = at(spine.x, 0);
  cy[0] = at(spine.y, 0);
  for (let j = 0; j < n - 1; j++) {
    const m = at(segS, j);
    const th =
      amplitude *
      m ** power *
      (Math.sin(t * omega - m * k) + 0.25 * Math.sin(t * omega * 0.5 + 1.3 - m * k * 0.6));
    cx[j + 1] = at(cx, j) + at(segL, j) * Math.cos(at(segA, j) + th);
    cy[j + 1] = at(cy, j) + at(segL, j) * Math.sin(at(segA, j) + th);
  }

  for (let j = 0; j < n; j++) {
    const a = Math.max(0, j - 1);
    const b = Math.min(n - 1, j + 1);
    const tx = at(cx, b) - at(cx, a);
    const ty = at(cy, b) - at(cy, a);
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const hw = spine.half - taper * at(spine.s, j);
    for (let side = 0; side < 2; side++) {
      const sg = side ? 1 : -1;
      const o = (j * 2 + side) * 4;
      verts[o] = ((at(cx, j) + nx * hw * sg + pad) / canvasWidth) * 2 - 1;
      verts[o + 1] = 1 - ((at(cy, j) + ny * hw * sg + pad) / canvasHeight) * 2;
      verts[o + 2] = (at(spine.x, j) + at(spine.nx, j) * hw * sg) / spine.w;
      verts[o + 3] = (at(spine.y, j) + at(spine.ny, j) * hw * sg) / spine.h;
    }
  }
  return verts;
}
