import { describe, expect, it } from 'vitest';
import {
  coverMap,
  PAINTING,
  paintingToScreen,
  parseObjectPosition,
  pxPerUnit,
  REFERENCE_MAP,
  unitsToPainting,
} from '@/components/sections/home/dragon/cover';
import {
  catmullRom,
  FLIGHT_DESKTOP,
  FLIGHT_MS,
  FLIGHT_PHONE,
  flightAt,
  flightOpacity,
  haze,
  headingTurnDeg,
  nextRoll,
  tiltDeg,
} from '@/components/sections/home/dragon/flight';
import {
  bobUnits,
  WING_LOOP_S,
  wingWeights,
} from '@/components/sections/home/dragon/wings';

describe('cover map', () => {
  it('matches the reference hero', () => {
    const m = coverMap({ width: 1183, height: 722 }, PAINTING, { x: 0.7, y: 0.4 });
    expect(m.scale).toBeCloseTo(0.940104, 6);
    expect(m.offsetX).toBeCloseTo(77.41, 2);
    expect(m.offsetY).toBe(0);
  });

  it('matches the phone crop', () => {
    const m = coverMap({ width: 390, height: 784 }, PAINTING, { x: 0.66, y: 0.5 });
    expect(m.scale).toBeCloseTo(1.020833, 6);
    expect(m.offsetX).toBeCloseTo(669.68, 2);
  });

  it('parses object-position', () => {
    expect(parseObjectPosition('70% 40%')).toEqual({ x: 0.7, y: 0.4 });
    expect(parseObjectPosition('center')).toEqual({ x: 0.5, y: 0.5 });
    expect(parseObjectPosition('10px 20px')).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('paths', () => {
  it('round-trips every desktop point through the reference map', () => {
    expect(pxPerUnit(REFERENCE_MAP)).toBe(1);
    for (const p of FLIGHT_DESKTOP) {
      const s = paintingToScreen(unitsToPainting(p), REFERENCE_MAP);
      expect(Math.abs(s.x - p.x)).toBeLessThan(1e-9);
      expect(Math.abs(s.y - p.y)).toBeLessThan(1e-9);
    }
  });

  it('lands the last point on the painting at 1296x972', () => {
    const last = FLIGHT_DESKTOP.at(-1);
    if (!last) throw new Error('empty path');
    const q = unitsToPainting(last);
    expect(q.x).toBeCloseTo(644.0, 0);
    expect(q.y).toBeCloseTo(396.8, 0);
    expect(Math.abs(q.x - 644.0)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(q.y - 396.8)).toBeLessThanOrEqual(0.1);
    const map = coverMap({ width: 1296, height: 972 }, PAINTING, { x: 0.7, y: 0.4 });
    const s = paintingToScreen(q, map);
    expect(Math.abs((s.x + map.offsetX) / map.scale - q.x)).toBeLessThan(1e-9);
    expect(Math.abs((s.y + map.offsetY) / map.scale - q.y)).toBeLessThan(1e-9);
  });

  it('passes through each key point', () => {
    for (let i = 0; i <= 7; i++) {
      const c = catmullRom(FLIGHT_DESKTOP, i / 7);
      const want = FLIGHT_DESKTOP[i];
      expect(c.x).toBeCloseTo(want?.x ?? NaN, 6);
      expect(c.y).toBeCloseTo(want?.y ?? NaN, 6);
      expect(c.s).toBeCloseTo(want?.s ?? NaN, 6);
    }
  });

  // The e2e restart check (hero-dragon.spec.ts) relies on this: a rising data-scale means a new flight.
  it('only ever shrinks the dragon, on both paths', () => {
    for (const [name, path] of [
      ['desktop', FLIGHT_DESKTOP],
      ['phone', FLIGHT_PHONE],
    ] as const) {
      const scales = Array.from({ length: 1401 }, (_, step) => catmullRom(path, step / 1400).s);
      const rises = scales.filter((s, step) => step > 0 && s > (scales[step - 1] ?? s));
      expect(rises, name).toEqual([]);
      expect(scales[0], name).toBe(2.4);
      expect(scales.at(-1), name).toBeCloseTo(0.15, 9);
    }
  });
});

describe('flight frames', () => {
  it('clamps negative time and ends at the duration', () => {
    expect(flightAt(FLIGHT_DESKTOP, -16)).toEqual(flightAt(FLIGHT_DESKTOP, 0));
    expect(flightAt(FLIGHT_DESKTOP, FLIGHT_MS)).toBeNull();
    expect(flightAt(FLIGHT_DESKTOP, 7000)?.p).toBeCloseTo(0.5, 12);
  });

  it('fades opacity in and out', () => {
    expect(flightOpacity(0)).toBe(0);
    expect(flightOpacity(0.02)).toBeCloseTo(0.5, 12);
    expect(flightOpacity(0.5)).toBe(1);
    expect(flightOpacity(0.91)).toBeCloseTo(0.5, 12);
    expect(flightOpacity(1)).toBe(0);
  });

  it('hazes with distance', () => {
    expect(haze(1)).toBe(0);
    expect(haze(0.15)).toBeCloseTo(1, 12);
    expect(haze(0.575)).toBeCloseTo(0.5, 12);
    expect(haze(2.4)).toBe(0);
  });
});

describe('roll', () => {
  it('eases towards the clamped target', () => {
    expect(nextRoll(0, 10)).toBeCloseTo(0.72, 12);
    expect(nextRoll(0, -1)).toBeCloseTo(-0.3, 12);
    let r = 0;
    for (let i = 0; i < 200; i++) r = nextRoll(r, 100);
    expect(r).toBeCloseTo(12, 2);
  });

  it('wobbles around the roll', () => {
    expect(tiltDeg(5, 0)).toBeCloseTo(5, 12);
    expect(tiltDeg(5, 775)).toBeCloseTo(6, 12);
  });

  it('measures heading change', () => {
    expect(Number.isFinite(headingTurnDeg(FLIGHT_DESKTOP, 0))).toBe(true);
    expect(Number.isFinite(headingTurnDeg(FLIGHT_DESKTOP, 1))).toBe(true);
    expect(Math.abs(headingTurnDeg(FLIGHT_DESKTOP, 0.5))).toBeGreaterThan(0);
  });
});

describe('wings', () => {
  it('blends the frames at known times', () => {
    expect(wingWeights(0)).toEqual([1, 0, 0]);
    const near = (tm: number, want: number[]): void => {
      wingWeights(tm).forEach((v, i) => expect(v).toBeCloseTo(want[i] ?? NaN, 9));
    };
    near(0.46, [1, 1, 0]);
    near(0.9, [0, 0, 1]);
    near(4.5, [0, 1, 0]);
    near(5.49, [1, 1, 0]);
  });

  it('keeps every weight in range and the body undimmed', () => {
    for (let i = 0; i < 2000; i++) {
      const w = wingWeights((i / 2000) * WING_LOOP_S);
      for (const v of w) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(Math.max(...w)).toBe(1);
    }
  });

  it('never reads past the array', () => {
    expect(wingWeights(99).every(Number.isFinite)).toBe(true);
    expect(wingWeights(-3).every(Number.isFinite)).toBe(true);
  });
});

describe('bob', () => {
  it('follows the flap and glide curves', () => {
    expect(bobUnits(0)).toBeCloseTo(5.6631, 4);
    expect(bobUnits(4.5)).toBeCloseTo(4, 12);
    expect(bobUnits(3.4)).toBeCloseTo(0, 12);
  });
});
