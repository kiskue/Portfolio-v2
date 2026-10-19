import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  DARK_QUERY,
  DEFAULT_PREFS,
  DISPLAY_KEY,
  DISPLAY_PREPAINT,
  MOTION_PREFS,
  REDUCED_MOTION_QUERY,
  THEME_PREFS,
  applyDisplay,
  parsePrefs,
  resolveDisplay,
  serializePrefs,
  type DisplayEnv,
  type ResolvedDisplay,
} from '@/lib/display-settings';

interface FakeRoot {
  readonly classes: Set<string>;
  readonly classList: { toggle(token: string, force?: boolean): boolean };
  readonly style: { colorScheme: string };
  readonly dataset: { [name: string]: string | undefined };
}

function fakeRoot(initiallyDark: boolean): FakeRoot {
  const classes = new Set<string>(initiallyDark ? ['dark'] : []);
  return {
    classes,
    classList: {
      toggle(token, force) {
        const on = force ?? !classes.has(token);
        if (on) classes.add(token);
        else classes.delete(token);
        return on;
      },
    },
    style: { colorScheme: '' },
    dataset: {},
  };
}

/** What the page would show: the three things the script writes. */
function observed(root: FakeRoot) {
  return {
    dark: root.classes.has('dark'),
    colorScheme: root.style.colorScheme,
    motion: root.dataset.motion,
  };
}

function expected(display: ResolvedDisplay) {
  return {
    dark: display.dark,
    colorScheme: display.dark ? 'dark' : 'light',
    motion: display.reduceMotion ? 'reduce' : 'full',
  };
}

interface RunOptions {
  readonly raw: string | null;
  readonly env: DisplayEnv;
  readonly initiallyDark?: boolean;
  readonly storageThrows?: boolean;
  readonly noMatchMedia?: boolean;
}

function runPrepaint({ raw, env, initiallyDark = false, storageThrows, noMatchMedia }: RunOptions) {
  const root = fakeRoot(initiallyDark);
  const keysRead: string[] = [];
  const localStorage = {
    getItem(key: string): string | null {
      keysRead.push(key);
      if (storageThrows) throw new Error('SecurityError: storage is disabled');
      return key === DISPLAY_KEY ? raw : null;
    },
  };
  const matchMedia = (query: string) => ({
    matches:
      (query === DARK_QUERY && env.prefersDark) ||
      (query === REDUCED_MOTION_QUERY && env.prefersReducedMotion),
  });
  const context = {
    document: { documentElement: root },
    localStorage,
    window: noMatchMedia ? {} : { matchMedia },
  };
  vm.runInNewContext(DISPLAY_PREPAINT, context);
  return { root, keysRead };
}

const ENVS: readonly DisplayEnv[] = [
  { prefersDark: false, prefersReducedMotion: false },
  { prefersDark: true, prefersReducedMotion: false },
  { prefersDark: false, prefersReducedMotion: true },
  { prefersDark: true, prefersReducedMotion: true },
];

const themeValues = [undefined, ...THEME_PREFS, 'blue', 42] as const;
const motionValues = [undefined, ...MOTION_PREFS, 'full', true] as const;

const RAWS: readonly (string | null)[] = [
  null,
  '',
  'not json',
  '{"theme":',
  'null',
  '42',
  'true',
  '"dark"',
  '[]',
  '["dark"]',
  '{}',
  ...themeValues.flatMap((theme) =>
    motionValues.map((motion) => JSON.stringify({ theme, motion })),
  ),
];

describe('DISPLAY_PREPAINT parity with resolveDisplay', () => {
  for (const env of ENVS) {
    for (const raw of RAWS) {
      for (const initiallyDark of [false, true]) {
        it(`raw=${String(raw)} dark-os=${env.prefersDark} reduce-os=${env.prefersReducedMotion} start-dark=${initiallyDark}`, () => {
          const { root } = runPrepaint({ raw, env, initiallyDark });
          expect(observed(root)).toEqual(expected(resolveDisplay(parsePrefs(raw), env)));
        });
      }
    }
  }

  it('reads exactly the gm.display key', () => {
    const { keysRead } = runPrepaint({ raw: '{"theme":"dark"}', env: ENVS[0]! });
    expect(keysRead).toEqual([DISPLAY_KEY]);
    expect(DISPLAY_KEY).toBe('gm.display');
  });

  it('falls back to the OS preferences when localStorage throws', () => {
    for (const env of ENVS) {
      const { root } = runPrepaint({ raw: '{"theme":"light"}', env, storageThrows: true });
      expect(observed(root)).toEqual(expected(resolveDisplay(DEFAULT_PREFS, env)));
    }
  });

  it('treats a missing matchMedia as "no preference"', () => {
    const noPreference: DisplayEnv = { prefersDark: false, prefersReducedMotion: false };
    for (const raw of RAWS) {
      const { root } = runPrepaint({ raw, env: ENVS[3]!, noMatchMedia: true });
      expect(observed(root)).toEqual(expected(resolveDisplay(parsePrefs(raw), noPreference)));
    }
  });

  it('applyDisplay writes the same DOM state as the script', () => {
    for (const env of ENVS) {
      for (const raw of RAWS) {
        const fromScript = runPrepaint({ raw, env, initiallyDark: true }).root;
        const fromStore = fakeRoot(true);
        applyDisplay(fromStore, resolveDisplay(parsePrefs(raw), env));
        expect(observed(fromStore)).toEqual(observed(fromScript));
      }
    }
  });

  it('is one self-contained IIFE that is safe to inline in <head>', () => {
    expect(DISPLAY_PREPAINT.startsWith('(function(){')).toBe(true);
    expect(DISPLAY_PREPAINT.endsWith('})()')).toBe(true);
    expect(DISPLAY_PREPAINT).not.toMatch(/<\/script/i);
    expect(DISPLAY_PREPAINT).not.toMatch(/\n/);
  });
});

describe('parsePrefs', () => {
  it('returns the defaults for missing or malformed input', () => {
    for (const raw of [null, undefined, '', 'not json', 'null', '42', '"dark"', '[]']) {
      expect(parsePrefs(raw)).toEqual(DEFAULT_PREFS);
    }
  });

  it('keeps known values and replaces unknown ones with "system"', () => {
    expect(parsePrefs('{"theme":"dark","motion":"reduce"}')).toEqual({ theme: 'dark', motion: 'reduce' });
    expect(parsePrefs('{"theme":"light"}')).toEqual({ theme: 'light', motion: 'system' });
    expect(parsePrefs('{"theme":"blue","motion":"full"}')).toEqual(DEFAULT_PREFS);
  });

  it('ignores the removed text-size setting', () => {
    expect(parsePrefs('{"theme":"dark","text":"large"}')).toEqual({ theme: 'dark', motion: 'system' });
  });

  it('round-trips through serializePrefs', () => {
    for (const theme of THEME_PREFS) {
      for (const motion of MOTION_PREFS) {
        expect(parsePrefs(serializePrefs({ theme, motion }))).toEqual({ theme, motion });
      }
    }
  });
});

describe('resolveDisplay', () => {
  it('follows the OS only while a preference is "system"', () => {
    const darkOs: DisplayEnv = { prefersDark: true, prefersReducedMotion: false };
    expect(resolveDisplay({ theme: 'system', motion: 'system' }, darkOs)).toEqual({ dark: true, reduceMotion: false });
    expect(resolveDisplay({ theme: 'light', motion: 'system' }, darkOs)).toEqual({ dark: false, reduceMotion: false });
    expect(resolveDisplay({ theme: 'dark', motion: 'reduce' }, ENVS[0]!)).toEqual({ dark: true, reduceMotion: true });
  });

  it('never turns motion back on when the OS asks for reduced motion', () => {
    const reducedOs: DisplayEnv = { prefersDark: false, prefersReducedMotion: true };
    for (const motion of MOTION_PREFS) {
      expect(resolveDisplay({ theme: 'system', motion }, reducedOs).reduceMotion).toBe(true);
    }
  });
});
