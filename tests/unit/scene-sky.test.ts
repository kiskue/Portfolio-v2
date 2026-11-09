import { describe, expect, it } from 'vitest';
import { SUNRISE, SUNSET, WARM_FILTER, skyChange, type SkyAnimation } from '@/components/sections/home/sky';

type Row = readonly [layer: string, duration: number, delay: number, fill: string, easing: string, keyframes: readonly Keyframe[]];

/** layer / duration / delay / fill / effect easing / keyframes per entry: the design's §3.2 table. */
function rows(set: readonly SkyAnimation[]): Row[] {
  return set.map((entry): Row => [entry.layer, entry.timing.duration, entry.timing.delay, entry.timing.fill, entry.timing.easing, entry.keyframes]);
}

describe('the sky change', () => {
  it('SUNSET follows the table, entry by entry', () => {
    expect(rows(SUNSET)).toEqual([
      ['day', 900, 0, 'forwards', 'ease', [{ filter: 'none' }, { filter: WARM_FILTER }]],
      ['day', 1300, 600, 'backwards', 'ease', [{ opacity: 1 }, { opacity: 0 }]],
      ['night', 1500, 550, 'backwards', 'ease', [{ opacity: 0 }, { opacity: 1 }]],
      ['tint', 2600, 0, 'backwards', 'linear', [{ opacity: 0, easing: 'ease' }, { opacity: 1, offset: 0.35, easing: 'ease' }, { opacity: 0 }]],
      ['scrim-day', 1200, 350, 'backwards', 'ease', [{ opacity: 1 }, { opacity: 0 }]],
      ['scrim-night', 1200, 350, 'backwards', 'ease', [{ opacity: 0 }, { opacity: 1 }]],
      ['stars', 600, 2200, 'backwards', 'ease', [{ opacity: 0 }, { opacity: 1 }]],
    ]);
  });

  it('SUNRISE follows the table, entry by entry', () => {
    expect(rows(SUNRISE)).toEqual([
      ['night', 1100, 100, 'backwards', 'ease', [{ opacity: 1 }, { opacity: 0 }]],
      ['day', 1200, 0, 'backwards', 'ease', [{ opacity: 0 }, { opacity: 1 }]],
      ['day', 1300, 500, 'backwards', 'ease', [{ filter: WARM_FILTER }, { filter: 'none' }]],
      ['tint', 2400, 0, 'backwards', 'linear', [{ opacity: 0, easing: 'ease' }, { opacity: 0.85, offset: 0.4, easing: 'ease' }, { opacity: 0 }]],
      ['scrim-day', 1200, 350, 'backwards', 'ease', [{ opacity: 0 }, { opacity: 1 }]],
      ['scrim-night', 1200, 350, 'backwards', 'ease', [{ opacity: 1 }, { opacity: 0 }]],
    ]);
  });

  it('picks the set from the direction of the change', () => {
    expect(skyChange(false, true)).toBe(SUNSET);
    expect(skyChange(true, false)).toBe(SUNRISE);
    expect(skyChange(true, true)).toEqual([]);
    expect(skyChange(false, false)).toEqual([]);
  });
});
