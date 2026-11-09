/** [seconds, frame] keys; frame 0 up, 1 middle, 2 down. */
export const WING_PATTERN: readonly (readonly [number, 0 | 1 | 2])[] = [
  [0, 0], [0.4, 0], [0.52, 1], [0.6, 1], [0.72, 2], [1.05, 2], [1.22, 1], [1.36, 1],
  [1.53, 0], [1.7, 0], [2.1, 0], [2.22, 1], [2.3, 1], [2.42, 2], [2.75, 2], [2.92, 1],
  [3.06, 1], [3.23, 0], [3.4, 0], [3.62, 1], [5.38, 1], [5.6, 0],
];

export const WING_LOOP_S = 5.6;
export const FLAP_END_S = 3.4;
export const BEAT_S = 1.7;

/** Weights of the (up, level, down) frames. The new pose fades in first, so the body never dims. */
export function wingWeights(tm: number): readonly [number, number, number] {
  const c = Math.max(0, Math.min(WING_LOOP_S, tm));
  const key = (j: number): readonly [number, 0 | 1 | 2] => WING_PATTERN[j] ?? [0, 0];
  let i = 0;
  while (i < WING_PATTERN.length - 2 && c > key(i + 1)[0]) i++;
  const a = key(i);
  const b = key(i + 1);
  const k = (c - a[0]) / (b[0] - a[0]);
  const op: [number, number, number] = [0, 0, 0];
  op[a[1]] = Math.max(op[a[1]], Math.min(1, 2 - 2 * k));
  op[b[1]] = Math.max(op[b[1]], Math.min(1, 2 * k));
  return op;
}

/** Vertical bob in units at scale 1: lifts after each downstroke, sinks a little while gliding. */
export function bobUnits(tm: number): number {
  if (tm < FLAP_END_S) return -Math.sin(2 * Math.PI * ((tm % BEAT_S) / BEAT_S - 0.35)) * 7;
  return Math.sin((Math.PI * (tm - FLAP_END_S)) / (WING_LOOP_S - FLAP_END_S)) * 4;
}
