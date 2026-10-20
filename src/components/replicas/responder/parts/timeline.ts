/*
 * In-screen animation times for the Responder glimpse steps (design-spec §5.3), in ms after
 * the step gets [data-active]. The glimpse player (W7) places its tap indicators at these
 * moments. Each animated state's static poster is its final frame, so reduced motion and
 * no-JS show the end of the story.
 */

/** 3.1 'online': the duty switch is tapped at FLIP, shows Connecting… for 0.4 s, then You're Online. */
export const DUTY_TIMELINE = { flipAt: 600, onlineAt: 1000 } as const;

/**
 * 3.2 'toast': the toast drops in at 0, the sheet rises to its 50% snap from RISE and settles
 * at SETTLED (a 420 ms rise); the glimpse taps ACCEPT after that, at ACCEPT_TAP.
 */
export const DISPATCH_TIMELINE = { riseAt: 500, settledAt: 920, acceptTapAt: 2200 } as const;

/**
 * 3.3 'on-site': the distance counts 1,240 → 80 m at NEAR (the zone flips first and the number
 * eases down over 900 ms, as the app's card does), then 80 → 18 m at ON SITE; arrival is
 * recorded and the footer becomes ADD UPDATE / RESOLVE at ARRIVED.
 */
export const NAV_TIMELINE = { nearAt: 1200, onSiteAt: 2400, arrivedAt: 2700 } as const;

/** 3.5 'thread': the mic is held from HOLD to RELEASE; the own voice note lands just after. */
export const PTT_TIMELINE = { holdAt: 600, releaseAt: 1800, landAt: 1900 } as const;

/**
 * Display values for a count from `from` to `to` over `ms`, eased out (cubic), as frames of
 * [atMs, value]. The first frame is `from` at `startMs`; the last is exactly `to`.
 */
export function countFrames(from: number, to: number, startMs: number, ms: number, steps: number): readonly (readonly [number, number])[] {
  const frames: (readonly [number, number])[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const eased = 1 - (1 - t) ** 3;
    frames.push([Math.round(startMs + t * ms), Math.round(from + (to - from) * eased)]);
  }
  return frames;
}
