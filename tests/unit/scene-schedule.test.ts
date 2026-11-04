import { describe, expect, it } from 'vitest';
import {
  FLOWN_KEY,
  markFlown,
  onThemeSwitch,
  OPENING_DELAY_MS,
  OPENING_GIVE_UP_MS,
  openingFlightDue,
  openingStartAt,
  SWITCH_DELAY_MS,
} from '@/components/sections/home/dragon/schedule';

describe('the opening flight, once per session', () => {
  it('is due unless the session already saw it', () => {
    const throwing = {
      getItem(): string | null {
        throw new Error('blocked');
      },
    };
    expect(openingFlightDue(null)).toBe(true);
    expect(openingFlightDue({ getItem: () => null })).toBe(true);
    expect(openingFlightDue({ getItem: () => '1' })).toBe(false);
    expect(openingFlightDue(throwing)).toBe(true);
  });

  it('reads and writes the gm.dragon key', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    expect(FLOWN_KEY).toBe('gm.dragon');
    markFlown(storage);
    expect(store.get('gm.dragon')).toBe('1');
    expect(openingFlightDue(storage)).toBe(false);
  });

  it('marking it flown never throws', () => {
    const throwing = {
      setItem(): void {
        throw new Error('quota');
      },
    };
    expect(() => markFlown(throwing)).not.toThrow();
    expect(() => markFlown(null)).not.toThrow();
  });
});

describe('when the opening flight starts', () => {
  it('starts 1.2 s after first paint, or when the dragon is ready if that is later', () => {
    expect(OPENING_DELAY_MS).toBe(1200);
    expect(openingStartAt(500, 900)).toBe(1700);
    expect(openingStartAt(500, 3000)).toBe(3000);
  });

  it('gives up when the dragon is ready more than 8 s after first paint', () => {
    expect(OPENING_GIVE_UP_MS).toBe(8000);
    expect(openingStartAt(500, 8500)).toBe(8500);
    expect(openingStartAt(500, 8600)).toBeNull();
  });
});

describe('a theme switch', () => {
  it('schedules a flight 1.6 s later', () => {
    expect(SWITCH_DELAY_MS).toBe(1600);
    expect(onThemeSwitch({ kind: 'idle' }, 10)).toEqual({ kind: 'scheduled', at: 1610 });
  });

  it('reschedules a pending flight from the new switch', () => {
    expect(onThemeSwitch({ kind: 'scheduled', at: 1610 }, 900)).toEqual({ kind: 'scheduled', at: 2500 });
  });

  it('leaves a flight in progress alone', () => {
    const flying = { kind: 'flying' } as const;
    expect(onThemeSwitch(flying, 900)).toBe(flying);
  });
});
