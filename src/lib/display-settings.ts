/**
 * Display settings: Theme (System / Light / Dark) and Motion (System / Reduce).
 * There is deliberately no text-size setting (PLAN cut).
 *
 * The single source of truth for both the inline pre-paint script in the root layout and the
 * client display store. tests/unit/display-prepaint.test.ts proves the script and
 * `resolveDisplay` agree for every input.
 */

export const DISPLAY_KEY = 'gm.display';

export const DARK_QUERY = '(prefers-color-scheme: dark)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const THEME_PREFS = ['system', 'light', 'dark'] as const;
export const MOTION_PREFS = ['system', 'reduce'] as const;

export type ThemePref = (typeof THEME_PREFS)[number];
export type MotionPref = (typeof MOTION_PREFS)[number];

export interface DisplayPrefs {
  readonly theme: ThemePref;
  readonly motion: MotionPref;
}

/** What the browser reports through matchMedia. */
export interface DisplayEnv {
  readonly prefersDark: boolean;
  readonly prefersReducedMotion: boolean;
}

export interface ResolvedDisplay {
  readonly dark: boolean;
  readonly reduceMotion: boolean;
}

export const DEFAULT_PREFS: DisplayPrefs = { theme: 'system', motion: 'system' };

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

/** Reads the stored JSON. Anything missing, malformed or unknown falls back to 'system'. */
export function parsePrefs(raw: string | null | undefined): DisplayPrefs {
  if (!raw) return DEFAULT_PREFS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFS;
  }
  if (typeof data !== 'object' || data === null) return DEFAULT_PREFS;
  const { theme, motion } = data as { readonly theme?: unknown; readonly motion?: unknown };
  return {
    theme: isOneOf(THEME_PREFS, theme) ? theme : DEFAULT_PREFS.theme,
    motion: isOneOf(MOTION_PREFS, motion) ? motion : DEFAULT_PREFS.motion,
  };
}

export function serializePrefs(prefs: DisplayPrefs): string {
  return JSON.stringify({ theme: prefs.theme, motion: prefs.motion });
}

/** The site can only add reduction: Motion 'system' follows the OS, 'reduce' forces it. */
export function resolveDisplay(prefs: DisplayPrefs, env: DisplayEnv): ResolvedDisplay {
  return {
    dark: prefs.theme === 'dark' || (prefs.theme === 'system' && env.prefersDark),
    reduceMotion: prefs.motion === 'reduce' || env.prefersReducedMotion,
  };
}

/** The parts of <html> the display settings touch (an HTMLElement satisfies this). */
export interface DisplayRoot {
  readonly classList: { toggle(token: string, force?: boolean): boolean };
  readonly style: { colorScheme: string };
  readonly dataset: { [name: string]: string | undefined };
}

/** Applies a resolved display exactly as DISPLAY_PREPAINT does. */
export function applyDisplay(root: DisplayRoot, display: ResolvedDisplay): void {
  root.classList.toggle('dark', display.dark);
  root.style.colorScheme = display.dark ? 'dark' : 'light';
  root.dataset.motion = display.reduceMotion ? 'reduce' : 'full';
}

/**
 * Inline pre-paint script: the first child of <head> in the root layout, so it runs while the
 * HTML is parsed, before first paint and before any JS chunk. Mirrors parsePrefs +
 * resolveDisplay + applyDisplay; every step is guarded so it never throws.
 */
export const DISPLAY_PREPAINT =
  '(function(){var d=document.documentElement,s=null,' +
  'm=function(q){try{return!!window.matchMedia(q).matches}catch(e){return!1}};' +
  `try{s=JSON.parse(localStorage.getItem(${JSON.stringify(DISPLAY_KEY)})||'null')}catch(e){}` +
  "if(!s||typeof s!=='object')s={};" +
  `var k=s.theme==='dark'||(s.theme!=='light'&&m(${JSON.stringify(DARK_QUERY)})),` +
  `r=s.motion==='reduce'||m(${JSON.stringify(REDUCED_MOTION_QUERY)});` +
  "try{d.classList.toggle('dark',k);d.style.colorScheme=k?'dark':'light';" +
  "d.dataset.motion=r?'reduce':'full'}catch(e){}})()";
