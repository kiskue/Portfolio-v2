import { EN_ROUTE_TIMELINE } from '@/components/replicas/kit';

/*
 * In-screen animation times for the Responder glimpse steps, in ms after the step gets
 * [data-active] (the step contract in src/content/apps/glimpses.ts). A step renders its `state`
 * while active and animates toward its `posterState`: 3.1 offline → online, 3.2 toast → sheet,
 * 3.3 far → on-site, 3.5 recording → thread. A screen reacts TAP_REACTION ms after a tap's atMs,
 * once the tap ring has scaled in. Static styles stay the state's own picture (the poster of
 * its animation), so reduced motion and no-JS show the state as named.
 * tests/unit/registry.responder.test.ts keeps these in step with glimpses.ts.
 */

/** How long after a tap's atMs the screen reacts (the ring scales in over 180 ms). */
export const TAP_REACTION = 180;

/**
 * 3.1 'offline': the duty switch is tapped at TAP (glimpses.ts), slides on at FLIP with
 * Connecting… for 0.4 s, and the chip reads You're Online at ONLINE.
 */
export const DUTY_TIMELINE = { tapAt: 500, flipAt: 500 + TAP_REACTION, onlineAt: 500 + TAP_REACTION + 400 } as const;

/**
 * 3.2 'toast': the toast drops in at 0 and the sheet rises to its 50% snap from RISE, settled
 * at SETTLED (a 420 ms rise). ACCEPT is tapped at ACCEPT_TAP and springs to 0.95 at ACCEPT_PRESS
 * (the app's FooterBtn).
 */
export const DISPATCH_TIMELINE = { riseAt: 500, settledAt: 920, acceptTapAt: 2400, acceptPressAt: 2400 + TAP_REACTION } as const;

/**
 * 3.3 'far': the drive, in step with the map's EN_ROUTE_TIMELINE (the puck glide and the route
 * recolour): the distance starts counting at START, crosses 500 m (CLOSE) at CLOSE, reads 80 m
 * (NEAR) at NEAR and 18 m (ON SITE) at ON_SITE, where the puck stops. Arrival is recorded within
 * 20 m, so the footer becomes ADD UPDATE / RESOLVE a beat later, at ARRIVED.
 */
export const NAV_TIMELINE = {
  startAt: EN_ROUTE_TIMELINE.startMs,
  closeAt: EN_ROUTE_TIMELINE.closeMs,
  nearAt: EN_ROUTE_TIMELINE.nearMs,
  onSiteAt: EN_ROUTE_TIMELINE.onSiteMs,
  arrivedAt: EN_ROUTE_TIMELINE.onSiteMs + 300,
} as const;

/**
 * 3.5 'recording': the mic is held from 300 ms for 1.2 s (glimpses.ts). It is pressed at HOLD
 * (the recording strip shows), released at RELEASE when the finger lifts, and the own voice note
 * lands at LAND.
 */
export const PTT_TIMELINE = { holdAt: 300 + TAP_REACTION, releaseAt: 300 + 1200, landAt: 300 + 1200 + 100 } as const;

/**
 * Distance readings along a count, as [atMs, metres]: `stops` are [atMs, metres] anchors (the
 * zone moments) and each leg between two anchors is split into `steps` linear readings, as the
 * app's card counts toward each new GPS fix. The first reading is the first anchor.
 */
export function countFrames(stops: readonly (readonly [number, number])[], steps: number): readonly (readonly [number, number])[] {
  const [first, ...rest] = stops;
  if (!first) return [];
  const frames: (readonly [number, number])[] = [first];
  let previous = first;
  for (const stop of rest) {
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      frames.push([Math.round(previous[0] + (stop[0] - previous[0]) * t), Math.round(previous[1] + (stop[1] - previous[1]) * t)]);
    }
    previous = stop;
  }
  return frames;
}
