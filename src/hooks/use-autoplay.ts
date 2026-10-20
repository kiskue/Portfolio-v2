import { useCallback, useReducer, type RefObject } from 'react';
import { autoplayReducer, autoplayStatus, INITIAL_AUTOPLAY, type AutoplayStatus } from '@/hooks/autoplay-state';
import { useDocumentHidden } from '@/hooks/use-document-hidden';
import { useInView } from '@/hooks/use-in-view';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export interface AutoplayOptions {
  /** Stop after this many completed runs (report each with endRun). Default: no limit. */
  readonly maxRuns?: number;
  /** The visible fraction below which playback pauses. Default 0.5 (WCAG 2.2.2 policy, design §5.3). */
  readonly threshold?: number;
}

export interface Autoplay extends AutoplayStatus {
  /** Completed runs since the last (re)start. */
  readonly runs: number;
  /** User pause: sticky until play(). */
  readonly pause: () => void;
  /** User play: also restarts after the run limit (Replay) and overrides the reduced-motion hold. */
  readonly play: () => void;
  /** Report one completed run (a marquee loop, a glimpse rotation). */
  readonly endRun: () => void;
}

/**
 * The one autoplay policy for every moving region (marquee, glimpse players): it runs only while
 * at least half of `ref`'s element is visible and the tab is shown, a user pause is sticky, and
 * under reduced motion it starts paused. Server render and hydration report running: false, so
 * the first frame (or static state) is what renders without JS.
 */
export function useAutoplay(ref: RefObject<Element | null>, options: AutoplayOptions = {}): Autoplay {
  const { maxRuns = Number.POSITIVE_INFINITY, threshold = 0.5 } = options;
  const visible = useInView(ref, { threshold });
  const hidden = useDocumentHidden();
  const reducedMotion = useReducedMotion();
  const [state, dispatch] = useReducer(autoplayReducer, INITIAL_AUTOPLAY);

  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const play = useCallback(() => dispatch({ type: 'play' }), []);
  const endRun = useCallback(() => dispatch({ type: 'run-ended', maxRuns }), [maxRuns]);

  return { ...autoplayStatus(state, { visible, hidden, reducedMotion }), runs: state.runs, pause, play, endRun };
}
