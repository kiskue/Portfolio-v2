/*
 * The autoplay policy (reuse rule 7) as a pure reducer plus a status function, so the rules
 * are unit-tested without a DOM. useAutoplay feeds it the live environment.
 *
 * - 'auto' (initial): plays while visible and the tab is shown; under reduced motion it starts
 *   paused, showing a Play control instead.
 * - 'paused': the user paused. Sticky: scrolling back or returning to the tab never resumes.
 * - 'playing': the user pressed Play. Plays even under reduced motion (the user opted in), but
 *   still suspends while off-screen or in a hidden tab.
 * - After `maxRuns` completed runs (loops, rotations) it ends; Play starts again from zero.
 */

export type AutoplayIntent = 'auto' | 'paused' | 'playing';

export interface AutoplayState {
  readonly intent: AutoplayIntent;
  /** Completed runs since the last (re)start. */
  readonly runs: number;
  readonly ended: boolean;
}

export type AutoplayAction =
  | { readonly type: 'pause' }
  | { readonly type: 'play' }
  | { readonly type: 'run-ended'; readonly maxRuns: number };

export interface AutoplayEnv {
  /** At least the visibility threshold (50%) of the element is on screen. */
  readonly visible: boolean;
  /** document.visibilityState is 'hidden'. */
  readonly hidden: boolean;
  readonly reducedMotion: boolean;
}

export interface AutoplayStatus {
  /** Animate now. */
  readonly running: boolean;
  /** Show "Play": the user paused, or reduced motion holds autoplay back until the user plays. */
  readonly userPaused: boolean;
  /** maxRuns reached; show "Replay". */
  readonly ended: boolean;
}

export const INITIAL_AUTOPLAY: AutoplayState = { intent: 'auto', runs: 0, ended: false };

export function autoplayReducer(state: AutoplayState, action: AutoplayAction): AutoplayState {
  switch (action.type) {
    case 'pause':
      return state.intent === 'paused' ? state : { ...state, intent: 'paused' };
    case 'play':
      return state.ended ? { intent: 'playing', runs: 0, ended: false } : { ...state, intent: 'playing' };
    case 'run-ended': {
      if (state.ended) return state;
      const runs = state.runs + 1;
      return { ...state, runs, ended: runs >= action.maxRuns };
    }
  }
}

export function autoplayStatus(state: AutoplayState, env: AutoplayEnv): AutoplayStatus {
  const userPaused = state.intent === 'paused' || (state.intent === 'auto' && env.reducedMotion);
  return {
    running: !state.ended && !userPaused && env.visible && !env.hidden,
    userPaused,
    ended: state.ended,
  };
}
