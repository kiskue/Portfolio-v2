/**
 * The 1.6 glimpse (design §5.3; src/content/apps/glimpses.ts SME_AI: hold 3800 ms, tap at
 * 600 ms): tap "Enhance with AI", "Enhancing…" for 0.6 s, a 1.8 s typewriter, then the
 * "AI-generated" card. Times are ms after the step becomes active ([data-active]); the static
 * poster is the idle card.
 *
 * The screen reacts 180 ms after the tap (the tap ring has then fully scaled in), so the request
 * runs 780–1380 ms and the paragraph types out by 3180 ms, 620 ms before the hold ends.
 *
 * As in the app (AIInsightCard), the pill switches to "AI-generated" the moment the enhanced text
 * arrives, and the typewriter starts on that same frame.
 */
export const ENHANCE_TIMING = {
  /** The glimpse's tap on "Enhance with AI" (glimpses.ts SME_AI taps[0].atMs). */
  tapAtMs: 600,
  /** The pill turns into the spinner and "Enhancing…", 180 ms after the tap. */
  enhancingAtMs: 780,
  /** The AI text arrives after 0.6 s: the pill reads "AI-generated" and the typewriter starts. */
  arrivedAtMs: 1380,
  /** The whole paragraph types out in this long (the app types 18 ms a character; the glimpse has 1.8 s). */
  typingMs: 1800,
  /**
   * Pill states cut, as the app re-renders them. (RStateSequence keeps the old frame opaque
   * while the next fades in, which would show both labels through the 10% pill.)
   */
  pillFadeMs: 0,
} as const;
