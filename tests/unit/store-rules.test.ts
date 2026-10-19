import { describe, expect, it } from 'vitest';
import { MIN_INSTALLS, MIN_RATINGS, showInstalls, showRating } from '@/lib/store-rules';

describe('showInstalls (only from 1K+)', () => {
  it('hides small or missing bands', () => {
    for (const band of ['0+', '1+', '10+', '100+', '500+'] as const) expect(showInstalls(band)).toBe(false);
    expect(showInstalls(null)).toBe(false);
    expect(showInstalls(undefined)).toBe(false);
  });

  it('shows bands at or above 1K', () => {
    for (const band of ['1K+', '5K+', '10K+', '1M+'] as const) expect(showInstalls(band)).toBe(true);
  });

  it('uses the documented threshold', () => {
    expect(MIN_INSTALLS).toBe(1_000);
  });
});

describe('showRating (only from 5 ratings)', () => {
  it('hides ratings with fewer than 5 ratings, whatever the score', () => {
    expect(showRating({ value: 5, count: 4 })).toBe(false);
    expect(showRating({ value: 4, count: 3 })).toBe(false);
    expect(showRating({ value: 0, count: 0 })).toBe(false);
    expect(showRating(null)).toBe(false);
  });

  it('shows ratings from 5 ratings up', () => {
    expect(showRating({ value: 5, count: 5 })).toBe(true);
    expect(showRating({ value: 4.2, count: 27 })).toBe(true);
    expect(showRating({ value: 5, count: 9 })).toBe(true);
  });

  it('uses the documented threshold', () => {
    expect(MIN_RATINGS).toBe(5);
  });
});
