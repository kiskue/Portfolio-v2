/*
 * The dragon's start gate (design §5 and §6.3; ledger Ruling 40). On Home the load event can fire
 * before first contentful paint, and a WebGL context asked for then waits for the GPU process to
 * finish the page's first frames: hundreds of milliseconds of blocked main thread, inside the LCP.
 * So the scene's start (its context, and any request for its frames) waits until the page has
 * settled, in this order:
 * 1. first contentful paint has happened, where the browser reports paints (after a client-side
 *    visit the entry is the earlier page's, which is fine);
 * 2. the painting the theme shows is decoded (this covers a client-side visit, where first paint
 *    says nothing about Home); one that fails to decode, or is missing, does not hold it back;
 * 3. two animation frames have run (a hidden page runs none, so it waits until it is shown);
 * 4. the main thread is idle: an idle callback at most 1 s away, or a task later without one (Safari).
 */

const FCP = 'first-contentful-paint';
const IDLE: IdleRequestOptions = { timeout: 1000 };

export interface Settling {
  /** Resolves once the page has settled; never once cancelled. */
  readonly settled: Promise<void>;
  /** Stops the wait for good, leaving no observer, frame, idle callback or timer behind. */
  cancel(): void;
}

/** Waits for the page to settle. `painting` finds the painting the theme shows when the wait gets to it. */
export function settle(painting: () => HTMLImageElement | null | undefined): Settling {
  let cancelled = false;
  /** Undoes what the step under way asked for: its observer, frame, idle callback or timer. */
  let undo = (): void => {};

  const painted = (): Promise<void> =>
    new Promise((resolve) => {
      if (performance.getEntriesByName(FCP).length > 0 || !PerformanceObserver.supportedEntryTypes.includes('paint')) {
        resolve();
        return;
      }
      const observer = new PerformanceObserver((list) => {
        if (list.getEntriesByName(FCP).length === 0) return;
        observer.disconnect();
        resolve();
      });
      undo = () => observer.disconnect();
      observer.observe({ type: 'paint', buffered: true });
    });

  const decoded = (): Promise<void> => painting()?.decode().catch(() => {}) ?? Promise.resolve();

  const frames = (): Promise<void> =>
    new Promise((resolve) => {
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => resolve());
      });
      undo = () => cancelAnimationFrame(frame);
    });

  const idle = (): Promise<void> =>
    new Promise((resolve) => {
      if (typeof requestIdleCallback === 'function') {
        const callback = requestIdleCallback(() => resolve(), IDLE);
        undo = () => cancelIdleCallback(callback);
      } else {
        const timer = setTimeout(resolve, 0);
        undo = () => clearTimeout(timer);
      }
    });

  const settled = (async (): Promise<void> => {
    for (const step of [painted, decoded, frames, idle]) {
      await step();
      undo = () => {};
      // Cancelled while the painting decoded (a decode cannot be undone): never go on.
      if (cancelled) await new Promise<never>(() => {});
    }
  })();

  return {
    settled,
    cancel(): void {
      cancelled = true;
      undo();
      undo = () => {};
    },
  };
}
