import type { FigureId, Glimpse, GlimpseStep } from '@/content/types';

/*
 * The glimpse player's sequencing (architecture D4) as a pure reducer, so every playback rule
 * is unit-tested without a DOM. The client parts (src/components/showcase/glimpse.client.tsx)
 * feed it the environment (visibility, the hidden tab, reduced motion, timers) and turn the
 * state into attributes on server-rendered frames.
 *
 * Model: a playlist holds one track per app (three on Home, one in a case-study hero). One
 * track is current at a time and plays its steps in order; when it finishes, the next track
 * starts. A rotation is one pass through every track. After `maxRotations` (2) rotations the
 * player ends and offers Replay. A track that is not current shows its poster step.
 *
 * The pause rules follow the site's one autoplay policy (src/hooks/autoplay-state.ts, reuse
 * rule 7) exactly; tests/unit/glimpse.test.ts proves the parity:
 * - intent 'auto' plays while visible, except under reduced motion, where it holds at the poster
 *   step until the user presses Play;
 * - a user pause is sticky: scrolling back or returning to the tab never resumes it;
 * - below 50% visibility or in a hidden tab the player is suspended: it resumes by itself, and
 *   the current step keeps its remaining time (the client reports the elapsed time);
 * - Play after the end replays from the start.
 */

// ─── Playlist ─────────────────────────────────────────────────────────────────────────────

export interface PlaylistStep {
  /** How long the step shows, in ms. */
  readonly holdMs: number;
}

export interface PlaylistTrack {
  readonly steps: readonly PlaylistStep[];
  /** The step shown for reduced motion, before playback starts, after the end, and while another track plays. */
  readonly posterStep: number;
  /** Brand skins the track cycles through, one per rotation (Home Citizen: 2). Default 1. */
  readonly rotations?: number;
  /** The poster step has a separate poster frame (its posterState differs from its played state). */
  readonly posterFrame?: boolean;
}

export interface Playlist {
  readonly tracks: readonly PlaylistTrack[];
  /** Rotations before the player ends (2 on Home). */
  readonly maxRotations: number;
  readonly reducedMotion: boolean;
}

/** Rotations before a glimpse player stops and offers Replay (PLAN "Glimpse player"). */
export const GLIMPSE_ROTATIONS = 2;

/** The state a step plays (under data-active) and the state its poster shows. */
export function stepStates(step: GlimpseStep, defaultState: string): { readonly play: string; readonly poster: string } {
  const play = step.state ?? defaultState;
  return { play, poster: step.posterState ?? play };
}

/**
 * The playlist for a player: one track per glimpse. `defaultState` gives a figure's default
 * state (figures.ts states[0]) for steps that name none. A poster step whose posterState differs
 * from its played state gets a separate poster frame.
 */
export function glimpsePlaylist(
  glimpses: readonly Glimpse[],
  defaultState: (figure: FigureId) => string,
  maxRotations: number = GLIMPSE_ROTATIONS,
): Playlist {
  return {
    tracks: glimpses.map((glimpse): PlaylistTrack => {
      const poster = glimpse.steps[glimpse.posterStep];
      const states = poster ? stepStates(poster, defaultState(poster.figure)) : null;
      const skins = glimpse.brandRotation?.length ?? 0;
      return {
        steps: glimpse.steps.map((step) => ({ holdMs: step.holdMs })),
        posterStep: glimpse.posterStep,
        ...(skins > 1 ? { rotations: skins } : {}),
        ...(states && states.poster !== states.play ? { posterFrame: true } : {}),
      };
    }),
    maxRotations,
    reducedMotion: false,
  };
}

// ─── State and events ─────────────────────────────────────────────────────────────────────

/** 'auto' plays by itself; 'paused' and 'playing' are the user's sticky choices. */
export type GlimpseIntent = 'auto' | 'paused' | 'playing';

/** playing: the timer runs · paused: by the user (or the reduced-motion hold) · suspended: off-screen or hidden tab · ended: after the last rotation. */
export type GlimpseStatus = 'playing' | 'paused' | 'suspended' | 'ended';

export interface GlimpseState {
  /** The current track (the app that plays). */
  readonly track: number;
  /** The current step of the current track. */
  readonly step: number;
  /** Completed rotations. The player ends when it reaches maxRotations. */
  readonly rotation: number;
  readonly status: GlimpseStatus;
  /** Show Play: the user paused, or reduced motion holds playback until the user plays. */
  readonly userPaused: boolean;
  /** Time left on the current step, in ms. */
  readonly remainingMs: number;
  readonly intent: GlimpseIntent;
  /** At least half of the player is on screen and the tab is shown. */
  readonly visible: boolean;
  readonly reducedMotion: boolean;
  /**
   * The current track shows its current step (rather than its poster). False before playback
   * first starts and after the end, so server HTML, no-JS and the end state show posters.
   */
  readonly started: boolean;
  /** A hovered or focused track (trio): it becomes current and the rotation holds on it. */
  readonly hover: number | null;
  /** Increments whenever a step starts from zero, so the client restarts its timer and animations. */
  readonly seq: number;
}

export type GlimpseEvent =
  /** The current step's hold ran out. */
  | { readonly type: 'TICK' }
  /** User pause. `elapsedMs`: how long the current step has played since its timer last started. */
  | { readonly type: 'PAUSE'; readonly elapsedMs?: number }
  /** User play (Replay after the end). */
  | { readonly type: 'PLAY' }
  | { readonly type: 'REPLAY' }
  /** Jump to a step (step dots, the app picker); the track defaults to the current one. */
  | { readonly type: 'GOTO'; readonly track?: number; readonly step: number }
  /** ≥50% in view AND the tab is shown. */
  | { readonly type: 'VISIBLE'; readonly visible: boolean; readonly elapsedMs?: number }
  /** Pointer or focus on a track (null when it leaves). */
  | { readonly type: 'HOVER'; readonly track: number | null }
  /** The reduced-motion preference changed. */
  | { readonly type: 'MOTION'; readonly reduced: boolean; readonly elapsedMs?: number };

// ─── Playlist helpers ─────────────────────────────────────────────────────────────────────

/** maxRotations as a usable limit: at least 1; Infinity plays forever. */
function rotationLimit(playlist: Playlist): number {
  const { maxRotations } = playlist;
  return Number.isNaN(maxRotations) || maxRotations < 1 ? 1 : maxRotations;
}

function trackAt(playlist: Playlist, track: number): PlaylistTrack | undefined {
  return playlist.tracks[track];
}

/** The track's poster step, clamped to its steps. */
export function posterStepOf(playlist: Playlist, track: number): number {
  const entry = trackAt(playlist, track);
  if (!entry || entry.steps.length === 0) return 0;
  return Math.min(Math.max(Math.round(entry.posterStep), 0), entry.steps.length - 1);
}

/** A step's hold in ms (0 for a missing step; negative or NaN holds count as 0). */
export function holdOf(playlist: Playlist, track: number, step: number): number {
  const hold = trackAt(playlist, track)?.steps[step]?.holdMs ?? 0;
  return Number.isFinite(hold) && hold > 0 ? hold : 0;
}

function hasStep(playlist: Playlist, track: number, step: number): boolean {
  const entry = trackAt(playlist, track);
  return entry !== undefined && Number.isInteger(step) && step >= 0 && step < entry.steps.length;
}

/** The skin index for a rotation: rotation mod count (Citizen: 0 Smile SAFE Taytay, 1 1Hope, 0 …). */
export function brandIndexForRotation(rotationCount: number, rotation: number): number {
  const count = Math.floor(rotationCount);
  if (!Number.isFinite(count) || count < 1 || !Number.isFinite(rotation)) return 0;
  const index = Math.floor(rotation) % count;
  return index < 0 ? index + count : index;
}

/**
 * The rotation whose skin a track shows. A track that has not started in the current rotation
 * (it comes later in the order) still shows the previous rotation's skin, so a re-skin happens
 * as that track starts to play rather than while another app plays. After the end every track
 * keeps the last rotation's skin.
 */
export function trackRotation(playlist: Playlist, state: GlimpseState, track: number): number {
  const played = track > state.track ? state.rotation - 1 : state.rotation;
  return Math.min(Math.max(played, 0), Math.max(rotationLimit(playlist) - 1, 0));
}

/** The brand skin index a track shows now (0 for tracks without a rotation). */
export function trackBrandIndex(playlist: Playlist, state: GlimpseState, track: number): number {
  return brandIndexForRotation(trackAt(playlist, track)?.rotations ?? 1, trackRotation(playlist, state, track));
}

// ─── Policy ───────────────────────────────────────────────────────────────────────────────

/** The autoplay policy (src/hooks/autoplay-state.ts) applied to a glimpse. */
export function glimpseStatus(
  playlist: Playlist,
  input: { readonly intent: GlimpseIntent; readonly visible: boolean; readonly reducedMotion: boolean; readonly rotation: number },
): { readonly status: GlimpseStatus; readonly userPaused: boolean } {
  const userPaused = input.intent === 'paused' || (input.intent === 'auto' && input.reducedMotion);
  if (input.rotation >= rotationLimit(playlist)) return { status: 'ended', userPaused };
  if (userPaused) return { status: 'paused', userPaused };
  return { status: input.visible ? 'playing' : 'suspended', userPaused };
}

type PolicyPatch = Partial<Pick<GlimpseState, 'intent' | 'visible' | 'reducedMotion' | 'rotation'>>;

/**
 * Applies a change to the policy inputs. Leaving 'playing' banks the elapsed time (the step
 * keeps the rest); entering 'playing' marks the player as started.
 */
function withPolicy(playlist: Playlist, state: GlimpseState, patch: PolicyPatch, elapsedMs = 0): GlimpseState {
  const next = { ...state, ...patch };
  const { status, userPaused } = glimpseStatus(playlist, next);
  const stopsClock = state.status === 'playing' && status !== 'playing';
  const elapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  return {
    ...next,
    status,
    userPaused,
    remainingMs: stopsClock ? Math.max(state.remainingMs - elapsed, 0) : state.remainingMs,
    started: state.started || status === 'playing',
  };
}

/** Starts a step from zero (its full hold, a new seq). */
function enter(playlist: Playlist, state: GlimpseState, track: number, step: number): GlimpseState {
  return { ...state, track, step, remainingMs: holdOf(playlist, track, step), seq: state.seq + 1 };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────────────────

/**
 * The initial state: not started, so every track shows its poster. Under reduced motion it is
 * paused at the first track's poster step; otherwise it waits for the first VISIBLE report
 * (`visible` lets a caller that already knows start in view).
 */
export function initGlimpse(playlist: Playlist, options: { readonly visible?: boolean } = {}): GlimpseState {
  const visible = options.visible ?? false;
  const step = playlist.reducedMotion ? posterStepOf(playlist, 0) : 0;
  const base = {
    track: 0,
    step,
    rotation: 0,
    intent: 'auto' as const,
    visible,
    reducedMotion: playlist.reducedMotion,
  };
  const { status, userPaused } = glimpseStatus(playlist, base);
  return {
    ...base,
    status,
    userPaused,
    remainingMs: holdOf(playlist, 0, step),
    started: status === 'playing',
    hover: null,
    seq: 0,
  };
}

/** The step after the current one (the target of the next TICK). */
function tick(playlist: Playlist, state: GlimpseState): GlimpseState {
  const steps = trackAt(playlist, state.track)?.steps.length ?? 0;
  if (state.step + 1 < steps) return enter(playlist, state, state.track, state.step + 1);
  // A hovered or focused app holds the rotation: it loops instead of handing over.
  if (state.hover === state.track) return enter(playlist, state, state.track, 0);
  if (state.track + 1 < playlist.tracks.length) return enter(playlist, state, state.track + 1, 0);

  const rotation = state.rotation + 1;
  if (rotation < rotationLimit(playlist)) return enter(playlist, { ...state, rotation }, 0, 0);
  // The end: every track back to its poster, with Replay offered.
  const ended = withPolicy(playlist, state, { rotation });
  const poster = posterStepOf(playlist, 0);
  return { ...ended, track: 0, step: poster, remainingMs: holdOf(playlist, 0, poster), started: false, seq: state.seq + 1 };
}

function replay(playlist: Playlist, state: GlimpseState): GlimpseState {
  const restarted = enter(playlist, { ...state, rotation: 0, hover: null }, 0, 0);
  const next = withPolicy(playlist, { ...restarted, started: false, status: 'paused' }, { intent: 'playing' });
  return { ...next, started: next.status === 'playing' };
}

export function reduceGlimpse(playlist: Playlist, state: GlimpseState, event: GlimpseEvent): GlimpseState {
  switch (event.type) {
    case 'TICK':
      return state.status === 'playing' ? tick(playlist, state) : state;

    case 'PAUSE':
      if (state.status === 'ended' || state.intent === 'paused') return state;
      return withPolicy(playlist, state, { intent: 'paused' }, event.elapsedMs);

    case 'PLAY':
      if (state.status === 'ended') return replay(playlist, state);
      if (state.intent === 'playing') return state;
      return withPolicy(playlist, state, { intent: 'playing' });

    case 'REPLAY':
      return replay(playlist, state);

    case 'GOTO': {
      const track = event.track ?? state.track;
      if (!hasStep(playlist, track, event.step)) return state;
      // After the end, a chosen step starts a fresh run, paused on that step.
      const from =
        state.status === 'ended' ? withPolicy(playlist, state, { rotation: 0, intent: 'paused' }) : state;
      return { ...enter(playlist, from, track, event.step), started: true };
    }

    case 'VISIBLE':
      if (event.visible === state.visible) return state;
      return withPolicy(playlist, state, { visible: event.visible }, event.elapsedMs);

    case 'HOVER': {
      const { track } = event;
      if (track === state.hover) return state;
      if (track !== null && trackAt(playlist, track) === undefined) return state;
      const hovered = { ...state, hover: track };
      const moves = track !== null && track !== state.track && (state.status === 'playing' || state.status === 'suspended');
      return moves ? enter(playlist, hovered, track, 0) : hovered;
    }

    case 'MOTION': {
      if (event.reduced === state.reducedMotion) return state;
      const next = withPolicy(playlist, state, { reducedMotion: event.reduced }, event.elapsedMs);
      // Before playback starts, reduced motion waits on the poster step (D4: "paused at posterStep").
      if (event.reduced && !next.started) {
        const poster = posterStepOf(playlist, next.track);
        return poster === next.step ? next : enter(playlist, next, next.track, poster);
      }
      return next;
    }
  }
}

// ─── What each track shows ────────────────────────────────────────────────────────────────

/** 'play' renders the step's state and animates under data-active; 'poster' is its static posterState. */
export type FrameKind = 'play' | 'poster';

export interface FrameRef {
  readonly step: number;
  readonly kind: FrameKind;
}

export function sameFrame(a: FrameRef | null, b: FrameRef | null): boolean {
  return a === b || (a !== null && b !== null && a.step === b.step && a.kind === b.kind);
}

function posterRef(playlist: Playlist, track: number): FrameRef {
  return { step: posterStepOf(playlist, track), kind: trackAt(playlist, track)?.posterFrame ? 'poster' : 'play' };
}

/**
 * The frame a track shows. Tracks other than the current one, the player before it starts and
 * after it ends show the poster step (its poster frame when it has one). Under reduced motion
 * the current track also prefers the poster frame on its poster step.
 */
export function shownFrame(playlist: Playlist, state: GlimpseState, track: number): FrameRef {
  if (track !== state.track || !state.started || state.status === 'ended') return posterRef(playlist, track);
  const poster = posterRef(playlist, track);
  if (state.reducedMotion && state.step === poster.step && poster.kind === 'poster') return poster;
  return { step: state.step, kind: 'play' };
}

/** Whether a track's shown frame is the live one: the player sets data-active on it. */
export function isLive(playlist: Playlist, state: GlimpseState, track: number): boolean {
  return (
    track === state.track && state.started && state.status !== 'ended' && shownFrame(playlist, state, track).kind === 'play'
  );
}

/** The frame a track shows after the next step change (for data-next), or null when it keeps its frame. */
export function upcomingFrame(playlist: Playlist, state: GlimpseState, track: number): FrameRef | null {
  if (state.status === 'ended' || trackAt(playlist, track) === undefined) return null;
  const next = state.started ? tick(playlist, { ...state, status: 'playing' }) : { ...state, started: true };
  const frame = shownFrame(playlist, next, track);
  return sameFrame(frame, shownFrame(playlist, state, track)) ? null : frame;
}

// ─── Player: the crossfade between frames ─────────────────────────────────────────────────

/** A frame fading out under the newly shown one; `live` frames keep data-active, frozen. */
export interface LeavingFrame {
  readonly frame: FrameRef;
  readonly live: boolean;
}

export interface PlayerState {
  readonly glimpse: GlimpseState;
  /** Per track: the frame that was shown before the last change, until SETTLE. */
  readonly leaving: readonly (LeavingFrame | null)[];
}

/** Glimpse events, plus SETTLE once a track's crossfade has finished. */
export type PlayerEvent = GlimpseEvent | { readonly type: 'SETTLE'; readonly track: number };

export function initPlayer(playlist: Playlist, options?: { readonly visible?: boolean }): PlayerState {
  return { glimpse: initGlimpse(playlist, options), leaving: playlist.tracks.map(() => null) };
}

/**
 * reduceGlimpse plus the crossfade: whenever a track's shown frame changes, the previous one
 * stays visible underneath (holding its last frame: the motion contract's exit rule) until the
 * client sends SETTLE after the enter transition.
 */
export function reducePlayer(playlist: Playlist, state: PlayerState, event: PlayerEvent): PlayerState {
  if (event.type === 'SETTLE') {
    if (!state.leaving[event.track]) return state;
    return { ...state, leaving: state.leaving.map((frame, track) => (track === event.track ? null : frame)) };
  }
  const glimpse = reduceGlimpse(playlist, state.glimpse, event);
  if (glimpse === state.glimpse) return state;
  const leaving = playlist.tracks.map((_, track) => {
    const before = shownFrame(playlist, state.glimpse, track);
    if (sameFrame(before, shownFrame(playlist, glimpse, track))) return state.leaving[track] ?? null;
    return { frame: before, live: isLive(playlist, state.glimpse, track) };
  });
  // Keep the array's identity when no track changed frames, so settle timers are not restarted.
  const unchanged = leaving.length === state.leaving.length && leaving.every((frame, track) => frame === state.leaving[track]);
  return { glimpse, leaving: unchanged ? state.leaving : leaving };
}
