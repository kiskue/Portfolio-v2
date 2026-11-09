export interface PathPoint {
  readonly x: number;
  readonly y: number;
  readonly s: number;
}

export const FLIGHT_DESKTOP: readonly PathPoint[] = [
  { x: 600, y: 1000, s: 2.4 },
  { x: 560, y: 740, s: 1.55 },
  { x: 500, y: 580, s: 1.05 },
  { x: 470, y: 480, s: 0.72 },
  { x: 480, y: 425, s: 0.5 },
  { x: 505, y: 395, s: 0.34 },
  { x: 520, y: 380, s: 0.23 },
  { x: 528, y: 373, s: 0.15 },
];

export const FLIGHT_PHONE: readonly PathPoint[] = [
  { x: 722, y: 950, s: 2.4 },
  { x: 703, y: 752, s: 1.55 },
  { x: 675, y: 639, s: 1.05 },
  { x: 651, y: 555, s: 0.72 },
  { x: 628, y: 489, s: 0.5 },
  { x: 609, y: 437, s: 0.34 },
  { x: 595, y: 400, s: 0.23 },
  { x: 587, y: 376, s: 0.15 },
];

export const FLIGHT_MS = 14_000;
export const PHONE_SCALE = 0.6;
export const DRAGON_UNITS = 375;

const ORIGIN: PathPoint = { x: 0, y: 0, s: 1 };

const clamp =(v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Catmull-Rom through the points, even time per segment; s is linear within a segment. */
export function catmullRom(path: readonly PathPoint[], t: number): PathPoint {
  const n = path.length - 1;
  const f = clamp(t, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const k = f - i;
  const at = (j: number): PathPoint => path[clamp(j, 0, n)] ?? ORIGIN;
  const p0 = at(i - 1);
  const p1 = at(i);
  const p2 = at(i + 1);
  const p3 = at(i + 2);
  const cr = (a: number, b: number, c: number, d: number): number =>
    0.5 *
    (2 * b +
      (-a + c) * k +
      (2 * a - 5 * b + 4 * c - d) * k * k +
      (-a + 3 * b - 3 * c + d) * k * k * k);
  return {
    x: cr(p0.x, p1.x, p2.x, p3.x),
    y: cr(p0.y, p1.y, p2.y, p3.y),
    s: p1.s + (p2.s - p1.s) * k,
  };
}

export interface FlightFrame {
  readonly x: number;
  readonly y: number;
  readonly s: number;
  readonly p: number;
  readonly opacity: number;
  readonly haze: number;
}

export function flightOpacity(p: number): number {
  return clamp(Math.min(1, p / 0.04, (1 - p) / 0.18), 0, 1);
}

export function haze(s: number): number {
  return clamp((1 - s) / 0.85, 0, 1);
}

/** Position, opacity and haze at `ms`; null once the flight is over. Bob and roll are the caller's. */
export function flightAt(
  path: readonly PathPoint[],
  ms: number,
  durationMs: number = FLIGHT_MS,
): FlightFrame | null {
  const p = Math.max(0, ms) / durationMs;
  if (p >= 1) return null;
  const { x, y, s } = catmullRom(path, p);
  return { x, y, s, p, opacity: flightOpacity(p), haze: haze(s) };
}

/** Heading change in degrees across p +- 0.01. */
export function headingTurnDeg(path: readonly PathPoint[], p: number): number {
  const a1 = catmullRom(path, Math.max(0, p - 0.01));
  const pt = catmullRom(path, p);
  const a2 = catmullRom(path, Math.min(1, p + 0.01));
  return (
    ((Math.atan2(a2.x - pt.x, pt.y - a2.y) - Math.atan2(pt.x - a1.x, a1.y - pt.y)) * 180) /
    Math.PI
  );
}

export function nextRoll(roll: number, turnDeg: number): number {
  return roll + (clamp(5 * turnDeg, -12, 12) - roll) * 0.06;
}

export function tiltDeg(roll: number, ms: number): number {
  return roll + Math.sin((2 * Math.PI * ms) / 3100);
}
