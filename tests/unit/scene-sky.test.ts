import { describe, expect, it } from 'vitest';
import { SUNRISE, SUNSET, WARM_FILTER, skyChange, type SkyAnimation } from '@/components/sections/home/sky';

/** layer / duration / delay / fill per entry: the design's §3.2 table. */
function summary(set: readonly SkyAnimation[]): readonly (readonly [string, number, number, string])[] {
  return set.map((entry) => [entry.layer, entry.timing.duration, entry.timing.delay, entry.timing.fill] as const);
}

describe('the sky change', () => {
  it('SUNSET follows the table', () => {
    expect(summary(SUNSET)).toEqual([
      ['day', 900, 0, 'forwards'],
      ['day', 1300, 600, 'backwards'],
      ['night', 1500, 550, 'backwards'],
      ['tint', 2600, 0, 'backwards'],
      ['scrim-day', 1200, 350, 'backwards'],
      ['scrim-night', 1200, 350, 'backwards'],
      ['stars', 600, 2200, 'backwards'],
    ]);
    expect(SUNSET[0]?.keyframes).toEqual([{ filter: 'none' }, { filter: WARM_FILTER }]);
    expect(SUNSET[3]?.keyframes).toEqual([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }]);
  });

  it('SUNRISE follows the table', () => {
    expect(summary(SUNRISE)).toEqual([
      ['night', 1100, 100, 'backwards'],
      ['day', 1200, 0, 'backwards'],
      ['day', 1300, 500, 'backwards'],
      ['tint', 2400, 0, 'backwards'],
      ['scrim-day', 1200, 350, 'backwards'],
      ['scrim-night', 1200, 350, 'backwards'],
    ]);
    expect(SUNRISE[2]?.keyframes).toEqual([{ filter: WARM_FILTER }, { filter: 'none' }]);
    expect(SUNRISE[3]?.keyframes).toEqual([{ opacity: 0 }, { opacity: 0.85, offset: 0.4 }, { opacity: 0 }]);
  });

  it('every entry eases with "ease"', () => {
    for (const entry of [...SUNSET, ...SUNRISE]) expect(entry.timing.easing).toBe('ease');
  });

  it('picks the set from the direction of the change', () => {
    expect(skyChange(false, true)).toBe(SUNSET);
    expect(skyChange(true, false)).toBe(SUNRISE);
    expect(skyChange(true, true)).toEqual([]);
    expect(skyChange(false, false)).toEqual([]);
  });
});
