import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  clipRuns,
  distance,
  distanceToPolyline,
  fmt,
  fractionNearest,
  growRect,
  headingOf,
  inPolygon,
  negate,
  pathData,
  polylineLength,
  poseAt,
  pt,
  roundCorners,
  samplePolyline,
  seededRandom,
  slicePolyline,
  smoothCurve,
} from '@/components/replicas/kit/map-geometry';

const L = [pt(0, 0), pt(0, -100), pt(100, -100)];

describe('map geometry', () => {
  it('measures headings as a compass: 0 north, 90 east, clockwise', () => {
    expect(headingOf(pt(0, 0), pt(0, -10))).toBe(0);
    expect(headingOf(pt(0, 0), pt(10, 0))).toBe(90);
    expect(headingOf(pt(0, 0), pt(0, 10))).toBe(180);
    expect(headingOf(pt(0, 0), pt(-10, 0))).toBe(270);
    expect(headingOf(pt(0, 0), pt(10, -10))).toBe(45);
  });

  it('poses a point along a polyline by length', () => {
    expect(polylineLength(L)).toBe(200);
    expect(poseAt(L, 0)).toEqual({ x: 0, y: 0, heading: 0 });
    expect(poseAt(L, 0.25)).toEqual({ x: 0, y: -50, heading: 0 });
    expect(poseAt(L, 0.75)).toEqual({ x: 50, y: -100, heading: 90 });
    expect(poseAt(L, 1)).toEqual({ x: 100, y: -100, heading: 90 });
    expect(poseAt(L, 2)).toEqual(poseAt(L, 1));
    expect(fractionNearest(L, pt(60, -90))).toBeCloseTo(0.8, 5);
  });

  it('slices and samples polylines', () => {
    const slice = slicePolyline(L, 0.25, 0.75);
    expect(slice).toEqual([pt(0, -50), pt(0, -100), pt(50, -100)]);
    const samples = samplePolyline(L, 10);
    expect(samples).toHaveLength(21);
    for (const sample of samples) expect(distanceToPolyline(L, sample)).toBeLessThan(1e-9);
  });

  it('rounds corners inside the original lines, keeping the ends', () => {
    const rounded = roundCorners(L, 10);
    expect(rounded[0]).toEqual(L[0]);
    expect(rounded.at(-1)).toEqual(L.at(-1));
    expect(polylineLength(rounded)).toBeLessThan(200);
    // The arc cuts the corner by at most r(√2 − 1)·… ≈ 3 px from the two legs.
    for (const point of samplePolyline(rounded, 1)) expect(distanceToPolyline(L, point)).toBeLessThan(3);
    expect(roundCorners([pt(0, 0), pt(0, -10), pt(0, -20)], 10)).toEqual([pt(0, 0), pt(0, -10), pt(0, -20)]);
  });

  it('runs a smooth curve through its control points', () => {
    const controls = [pt(0, 0), pt(50, 20), pt(100, 0), pt(150, 30)];
    const curve = smoothCurve(controls, 6);
    for (const control of controls) expect(Math.min(...curve.map((point) => distance(point, control)))).toBeLessThan(1e-9);
  });

  it('writes compact path data with separators, one decimal and no −0', () => {
    expect(pathData([pt(1.55, -0.04), pt(10, 2.25)])).toBe('M1.6 0 L10 2.3');
    expect(pathData([pt(0, 0), pt(1, 0), pt(1, 1)], true)).toBe('M0 0 L1 0 L1 1 Z');
    expect(fmt(-0.01)).toBe('0');
    // Runs of dotted numbers would read as an IPv4 address to the content-safety scan, so
    // coordinates are always separated by a space or a command letter.
    expect(pathData(samplePolyline(L, 0.7))).not.toMatch(/\d\.\d+\.\d/);
  });

  it('clips polylines to a rectangle as separate runs', () => {
    const line = [pt(0, 0), pt(100, 0), pt(200, 0), pt(300, 0)];
    expect(clipRuns(line, { x0: 120, y0: -5, x1: 180, y1: 5 })).toEqual([[pt(100, 0), pt(200, 0)]]);
    expect(clipRuns(line, { x0: 400, y0: -5, x1: 500, y1: 5 })).toEqual([]);
    expect(clipRuns(line, { x0: -10, y0: -5, x1: 350, y1: 5 })).toEqual([line]);
  });

  it('has rectangle, polygon and mirror helpers', () => {
    expect(boundsOf(L)).toEqual({ x0: 0, y0: -100, x1: 100, y1: 0 });
    expect(growRect({ x0: 0, y0: 0, x1: 10, y1: 10 }, 1, 2, 3, 4)).toEqual({ x0: -4, y0: -1, x1: 12, y1: 13 });
    const square = [pt(0, 0), pt(10, 0), pt(10, 10), pt(0, 10)];
    expect(inPolygon(pt(5, 5), square)).toBe(true);
    expect(inPolygon(pt(15, 5), square)).toBe(false);
    expect(negate(L)).toEqual([pt(-0, -0), pt(-0, 100), pt(-100, 100)]);
  });

  it('draws the same seeded sequence every time', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    for (const value of first) expect(value >= 0 && value < 1).toBe(true);
  });
});
