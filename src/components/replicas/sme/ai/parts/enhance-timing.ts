/**
 * The 1.6 glimpse (design §5.3): tap "Enhance with AI", "Enhancing…" for 0.6 s, a 1.8 s
 * typewriter, then "AI-generated", inside a 3.8 s hold. Times are ms after the step becomes
 * active ([data-active]); the static poster is the idle card.
 *
 * As in the app (AIInsightCard), the pill switches to "AI-generated" the moment the enhanced text
 * arrives, and the typewriter starts on that same frame.
 */
export const ENHANCE_TIMING = {
  /** Where the glimpse's tap ring should land (Tap.atMs): it peaks 180 ms later, on the press. */
  tapAtMs: 220,
  /** The pill turns into the spinner and "Enhancing…". */
  enhancingAtMs: 400,
  /** The AI text arrives: the pill reads "AI-generated" and the typewriter starts. */
  arrivedAtMs: 1000,
  /** The whole paragraph types out in this long (the app types 18 ms a character; the glimpse has 1.8 s). */
  typingMs: 1800,
  /**
   * Pill states cut, as the app re-renders them. (RStateSequence keeps the old frame opaque
   * while the next fades in, which would show both labels through the 10% pill.)
   */
  pillFadeMs: 0,
} as const;
