/*
 * Pure plane geometry for the fictional-town map (architecture D4): polylines in town
 * coordinates (logical px, y down, heading 0 = north and clockwise). No React; unit-tested in
 * tests/unit/map-geometry.test.ts.
 */

export interface MapPoint {
  readonly x: number;
  readonly y: number;
}

/** An axis-aligned rectangle by its edges (x0 ≤ x1, y0 ≤ y1). */
export interface MapRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** A position on a path with the direction of travel there (degrees, 0 = north, clockwise). */
export interface MapPose {
  readonly x: number;
  readonly y: number;
  readonly heading: number;
}

export function pt(x: number, y: number): MapPoint {
  return { x, y };
}

export function distance(a: MapPoint, b: MapPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Compass heading from a to b: 0 = north (up), 90 = east, in [0, 360). */
export function headingOf(a: MapPoint, b: MapPoint): number {
  const degrees = (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI;
  const normal = (Math.round(degrees * 1000) / 1000 + 360) % 360;
  return normal === 0 ? 0 : normal;
}

/** Running lengths: result[i] is the distance along the polyline to points[i]. */
export function cumulativeLengths(points: readonly MapPoint[]): readonly number[] {
  const lengths: number[] = [];
  let total = 0;
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (previous) total += distance(previous, point);
    lengths.push(total);
  });
  return lengths;
}

export function polylineLength(points: readonly MapPoint[]): number {
  return cumulativeLengths(points).at(-1) ?? 0;
}

/** The pose at `fraction` (0–1, clamped) of the polyline's length. */
export function poseAt(points: readonly MapPoint[], fraction: number): MapPose {
  const first = points[0];
  if (!first) return { x: 0, y: 0, heading: 0 };
  const lengths = cumulativeLengths(points);
  const total = lengths.at(-1) ?? 0;
  const target = Math.min(Math.max(fraction, 0), 1) * total;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const end = lengths[index] ?? 0;
    const start = lengths[index - 1] ?? 0;
    if (!a || !b || end - start <= 1e-9) continue;
    if (target <= end || index === points.length - 1) {
      const t = Math.min(Math.max((target - start) / (end - start), 0), 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, heading: headingOf(a, b) };
    }
  }
  const last = points.at(-1) ?? first;
  const before = points.at(-2) ?? first;
  return { x: last.x, y: last.y, heading: headingOf(before, last) };
}

/** Distance from p to segment ab, and the parameter t (0–1) of the closest point. */
export function segmentProjection(p: MapPoint, a: MapPoint, b: MapPoint): { readonly distance: number; readonly t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.min(Math.max(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared, 0), 1);
  return { distance: Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)), t };
}

/** Do segments ab and cd cross (or touch)? */
export function segmentsCross(a: MapPoint, b: MapPoint, c: MapPoint, d: MapPoint): boolean {
  const cross = (o: MapPoint, p: MapPoint, q: MapPoint): number => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** The shortest distance between segments ab and cd (0 when they cross). */
export function segmentDistance(a: MapPoint, b: MapPoint, c: MapPoint, d: MapPoint): number {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(
    segmentProjection(a, c, d).distance,
    segmentProjection(b, c, d).distance,
    segmentProjection(c, a, b).distance,
    segmentProjection(d, a, b).distance,
  );
}

/** The shortest distance between segment ab and a polyline. */
export function segmentToPolyline(a: MapPoint, b: MapPoint, points: readonly MapPoint[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    const c = points[index - 1];
    const d = points[index];
    if (c && d) best = Math.min(best, segmentDistance(a, b, c, d));
  }
  return best;
}

/** Squared distance from p to segment ab (allocation-free, for hot loops). */
function segmentDistanceSquared(p: MapPoint, a: MapPoint, b: MapPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.min(Math.max(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared, 0), 1);
  const ex = p.x - (a.x + dx * t);
  const ey = p.y - (a.y + dy * t);
  return ex * ex + ey * ey;
}

export function distanceToPolyline(points: readonly MapPoint[], p: MapPoint): number {
  if (points.length === 1 && points[0]) return distance(points[0], p);
  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a && b) best = Math.min(best, segmentDistanceSquared(p, a, b));
  }
  return Math.sqrt(best);
}

/** The fraction (0–1) of the polyline's length at the point closest to p. */
export function fractionNearest(points: readonly MapPoint[], p: MapPoint): number {
  const lengths = cumulativeLengths(points);
  const total = lengths.at(-1) ?? 0;
  if (total === 0) return 0;
  let best = Number.POSITIVE_INFINITY;
  let along = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (!a || !b) continue;
    const projection = segmentProjection(p, a, b);
    if (projection.distance < best - 1e-9) {
      best = projection.distance;
      along = (lengths[index - 1] ?? 0) + projection.t * distance(a, b);
    }
  }
  return along / total;
}

/** The part of the polyline between two fractions of its length (vertices kept in between). */
export function slicePolyline(points: readonly MapPoint[], from: number, to: number): readonly MapPoint[] {
  const lengths = cumulativeLengths(points);
  const total = lengths.at(-1) ?? 0;
  const start = poseAt(points, from);
  const end = poseAt(points, to);
  const inside = points.filter((_, index) => {
    const along = lengths[index] ?? 0;
    return along > from * total + 1e-6 && along < to * total - 1e-6;
  });
  return [pt(start.x, start.y), ...inside, pt(end.x, end.y)];
}

/** Points every `step` px along the polyline, both ends included. */
export function samplePolyline(points: readonly MapPoint[], step: number): readonly MapPoint[] {
  const total = polylineLength(points);
  if (total === 0) return points.slice(0, 1);
  const count = Math.max(1, Math.ceil(total / step));
  return Array.from({ length: count + 1 }, (_, index) => {
    const pose = poseAt(points, index / count);
    return { x: pose.x, y: pose.y };
  });
}

/**
 * A centripetal-free (uniform) Catmull-Rom spline through the control points, sampled
 * `perSegment` times between each pair: smooth rivers, coasts and curved roads as polylines.
 */
export function smoothCurve(points: readonly MapPoint[], perSegment = 8): readonly MapPoint[] {
  if (points.length < 3) return points;
  const result: MapPoint[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? points[index + 1];
    if (!p0 || !p1 || !p2 || !p3) continue;
    for (let step = 0; step < perSegment; step += 1) {
      const t = step / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      result.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  const last = points.at(-1);
  if (last) result.push(last);
  return result;
}

/**
 * The polyline with each interior corner replaced by a circular arc of up to `radius` px
 * (sampled), so a marker following it with offset-rotate turns smoothly instead of snapping.
 */
export function roundCorners(points: readonly MapPoint[], radius: number, steps = 6): readonly MapPoint[] {
  if (points.length < 3 || radius <= 0) return points;
  const first = points[0];
  if (!first) return points;
  const result: MapPoint[] = [first];
  for (let index = 1; index < points.length - 1; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const c = points[index + 1];
    if (!a || !b || !c) continue;
    const inLength = distance(a, b);
    const outLength = distance(b, c);
    const inDir = { x: (b.x - a.x) / inLength, y: (b.y - a.y) / inLength };
    const outDir = { x: (c.x - b.x) / outLength, y: (c.y - b.y) / outLength };
    const turn = Math.acos(Math.min(Math.max(inDir.x * outDir.x + inDir.y * outDir.y, -1), 1));
    if (turn < 1e-3) {
      result.push(b);
      continue;
    }
    // Tangent length for the arc, limited to half of each neighbouring leg.
    const cut = Math.min(radius * Math.tan(turn / 2), inLength / 2, outLength / 2);
    const start = { x: b.x - inDir.x * cut, y: b.y - inDir.y * cut };
    const end = { x: b.x + outDir.x * cut, y: b.y + outDir.y * cut };
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      // Quadratic Bezier through the corner: close to the arc for road-sized radii.
      const u = 1 - t;
      result.push({
        x: u * u * start.x + 2 * u * t * b.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * b.y + t * t * end.y,
      });
    }
  }
  const last = points.at(-1);
  if (last) result.push(last);
  return result;
}

/** The polyline mirrored through the origin: what the follow camera slides the world along. */
export function negate(points: readonly MapPoint[]): readonly MapPoint[] {
  return points.map((point) => ({ x: -point.x, y: -point.y }));
}

/** A coordinate for SVG and CSS path data: one decimal, no "-0". */
export function fmt(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** SVG path data for a polyline ("M x y L x y …"), optionally closed. */
export function pathData(points: readonly MapPoint[], closed = false): string {
  if (points.length === 0) return '';
  const body = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${fmt(point.x)} ${fmt(point.y)}`).join(' ');
  return closed ? `${body} Z` : body;
}

export function boundsOf(points: readonly MapPoint[]): MapRect {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    x0 = Math.min(x0, point.x);
    y0 = Math.min(y0, point.y);
    x1 = Math.max(x1, point.x);
    y1 = Math.max(y1, point.y);
  }
  return points.length === 0 ? { x0: 0, y0: 0, x1: 0, y1: 0 } : { x0, y0, x1, y1 };
}

export function unionRect(a: MapRect, b: MapRect): MapRect {
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

/** The rectangle grown by `left`, `top`, `right` and `bottom` px (CSS order). */
export function growRect(rect: MapRect, top: number, right = top, bottom = top, left = right): MapRect {
  return { x0: rect.x0 - left, y0: rect.y0 - top, x1: rect.x1 + right, y1: rect.y1 + bottom };
}

export function rectsOverlap(a: MapRect, b: MapRect): boolean {
  return a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
}

export function inRect(p: MapPoint, rect: MapRect): boolean {
  return p.x >= rect.x0 && p.x <= rect.x1 && p.y >= rect.y0 && p.y <= rect.y1;
}

/** Even-odd point-in-polygon test. */
export function inPolygon(p: MapPoint, polygon: readonly MapPoint[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    if (!a || !b) continue;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Does `box` overlap the rectangle, or any of the rectangles? */
export function overlapsAny(box: MapRect, rects: MapRect | readonly MapRect[]): boolean {
  return Array.isArray(rects) ? rects.some((rect: MapRect) => rectsOverlap(box, rect)) : rectsOverlap(box, rects as MapRect);
}

/**
 * The parts of a polyline whose segments touch `rects` (one rectangle or any of several), as
 * separate runs: culling for drawing, so a long avenue only emits the blocks a map can show.
 */
export function clipRuns(points: readonly MapPoint[], rects: MapRect | readonly MapRect[]): readonly (readonly MapPoint[])[] {
  const runs: MapPoint[][] = [];
  let current: MapPoint[] | null = null;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (!a || !b) continue;
    const touches = overlapsAny(boundsOf([a, b]), rects);
    if (touches) {
      if (current) current.push(b);
      else {
        current = [a, b];
        runs.push(current);
      }
    } else current = null;
  }
  return runs;
}

/** A small deterministic PRNG (mulberry32) for the town's lots and buildings. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
