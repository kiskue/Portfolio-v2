/*
 * The sky change (design §3.2): what each hero layer does when the theme flips. Pure data for the
 * Web Animations island (hero-scene.tsx). The resting state of every layer is CSS from `.dark`;
 * these animations only play the way there.
 */

export type SkyLayer = 'day' | 'night' | 'tint' | 'scrim-day' | 'scrim-night' | 'stars';

export interface SkyAnimation {
  readonly layer: SkyLayer;
  readonly keyframes: readonly Keyframe[];
  readonly timing: {
    readonly duration: number;
    readonly delay: number;
    readonly easing: 'ease';
    readonly fill: FillMode;
  };
}

/** The warm cast the day painting takes on at the golden hour. */
export const WARM_FILTER = 'brightness(.72) saturate(1.35) sepia(.3)';

function entry(layer: SkyLayer, keyframes: readonly Keyframe[], duration: number, delay: number, fill: FillMode = 'backwards'): SkyAnimation {
  return { layer, keyframes, timing: { duration, delay, easing: 'ease', fill } };
}

export const SUNSET: readonly SkyAnimation[] = [
  entry('day', [{ filter: 'none' }, { filter: WARM_FILTER }], 900, 0, 'forwards'),
  entry('day', [{ opacity: 1 }, { opacity: 0 }], 1300, 600),
  entry('night', [{ opacity: 0 }, { opacity: 1 }], 1500, 550),
  entry('tint', [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], 2600, 0),
  entry('scrim-day', [{ opacity: 1 }, { opacity: 0 }], 1200, 350),
  entry('scrim-night', [{ opacity: 0 }, { opacity: 1 }], 1200, 350),
  entry('stars', [{ opacity: 0 }, { opacity: 1 }], 600, 2200),
];

export const SUNRISE: readonly SkyAnimation[] = [
  entry('night', [{ opacity: 1 }, { opacity: 0 }], 1100, 100),
  entry('day', [{ opacity: 0 }, { opacity: 1 }], 1200, 0),
  entry('day', [{ filter: WARM_FILTER }, { filter: 'none' }], 1300, 500),
  entry('tint', [{ opacity: 0 }, { opacity: 0.85, offset: 0.4 }, { opacity: 0 }], 2400, 0),
  entry('scrim-day', [{ opacity: 0 }, { opacity: 1 }], 1200, 350),
  entry('scrim-night', [{ opacity: 1 }, { opacity: 0 }], 1200, 350),
];

/** The animations for a theme change: the sunset to dark, the sunrise to light, none when equal. */
export function skyChange(fromDark: boolean, toDark: boolean): readonly SkyAnimation[] {
  if (fromDark === toDark) return [];
  return toDark ? SUNSET : SUNRISE;
}
