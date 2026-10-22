'use client';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { buttonVariants } from '@/components/ui/button';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { useDocumentHidden } from '@/hooks/use-document-hidden';
import { useInView } from '@/hooks/use-in-view';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { BrandCssVars } from '@/lib/brand-vars';
import { cn } from '@/lib/cn';
import {
  brandIndexForRotation,
  frameStatus,
  holdOf,
  initPlayer,
  reducePlayer,
  shownFrame,
  trackRotation,
  type FrameKind,
  type GlimpseEvent,
  type GlimpseState,
  type Playlist,
  type PlayerEvent,
  type PlayerState,
} from '@/lib/glimpse';

export type { Playlist } from '@/lib/glimpse';

/*
 * The client half of the glimpse player (architecture D4): compound parts sharing one context.
 * Every step is a server-rendered tree; these parts only flip attributes on them:
 * - a frame that shows gets data-shown, the playing one data-active (the motion contract in
 *   src/styles/replica.css), the one coming next data-next; all others stay
 *   content-visibility:hidden (src/components/showcase/glimpse.css);
 * - a frame fading out under a new one keeps data-active with data-paused (its last frame);
 * - a lazy frame (a reduced-motion poster of a step other than the poster step) is mounted only
 *   while it is shown, fading out or next, so it adds no DOM until reduced motion needs it;
 * - pause and suspension set data-paused on the track, so the phones' animations freeze;
 * - the root carries data-status and, once hydrated, data-ready (controls show only with JS).
 * Steps change through plain state, never startTransition, so no View Transition fires.
 * Sequencing rules live in src/lib/glimpse.ts. Server code imports these parts through the
 * `Glimpse` namespace in glimpse.tsx (a Server Component cannot dot into a client module).
 */

/** Crossfade length before a leaving frame is hidden (the enter animation is 360ms, 120ms reduced). */
const SETTLE_MS = 400;
const SETTLE_REDUCED_MS = 150;

interface GlimpseContextValue {
  readonly playlist: Playlist;
  readonly player: PlayerState;
  readonly state: GlimpseState;
  /** Dispatches an event; PAUSE carries the time the current step has played. */
  readonly send: (event: GlimpseEvent) => void;
  readonly idBase: string;
}

const GlimpseContext = createContext<GlimpseContextValue | null>(null);

function useGlimpseContext(): GlimpseContextValue {
  const value = use(GlimpseContext);
  if (value === null) throw new Error('Glimpse parts must be rendered inside Glimpse.Root');
  return value;
}

/** The player's state and an event sender, for custom parts inside Glimpse.Root. */
export function useGlimpse(): Pick<GlimpseContextValue, 'playlist' | 'state' | 'send'> {
  const { playlist, state, send } = useGlimpseContext();
  return { playlist, state, send };
}

function subscribeNever(): () => void {
  return () => undefined;
}

/** False on the server and during hydration, true afterwards (no effect, no extra state). */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/** The track of the glimpse column an event target sits in, or null. */
function columnOf(target: EventTarget | null): number | null {
  const column = target instanceof Element ? target.closest('[data-glimpse-column]') : null;
  const value = column?.getAttribute('data-glimpse-column');
  return value == null || value === '' ? null : Number(value);
}

// ─── Root ─────────────────────────────────────────────────────────────────────────────────

export interface GlimpseRootProps {
  readonly playlist: Playlist;
  /** auto: timed playback · controlled: the step comes from `step` (no timers). */
  readonly mode: 'auto' | 'controlled';
  readonly step?: number;
  /** Accessible name of the whole preview (Glimpse.label). */
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  /** Layout name, exposed as data-layout for styling. */
  readonly layout?: 'trio' | 'hero' | 'single';
  /** Trio: pointer or focus on a [data-glimpse-column] makes its track current and holds the rotation there. */
  readonly hoverHold?: boolean;
}

export function GlimpseRoot({
  playlist,
  mode,
  step,
  label,
  children,
  className,
  layout,
  hoverHold = false,
}: GlimpseRootProps): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null);
  /** When the current step's timer last started (performance.now()). */
  const clock = useRef(0);
  const idBase = useId();
  const ready = useHydrated();
  const reducedMotion = useReducedMotion();
  const inView = useInView(rootRef, { threshold: 0.5 });
  const hidden = useDocumentHidden();
  const visible = inView && !hidden;

  const [player, dispatch] = useReducer(
    (current: PlayerState, event: PlayerEvent) => reducePlayer(playlist, current, event),
    playlist,
    (initial) => initPlayer(initial),
  );
  const state = player.glimpse;

  // The environment, as events: each one banks the time the current step has played.
  useEffect(() => {
    dispatch({ type: 'VISIBLE', visible, elapsedMs: performance.now() - clock.current });
  }, [visible]);
  useEffect(() => {
    dispatch({ type: 'MOTION', reduced: reducedMotion, elapsedMs: performance.now() - clock.current });
  }, [reducedMotion]);
  useEffect(() => {
    if (mode === 'controlled' && step !== undefined) dispatch({ type: 'GOTO', step });
  }, [mode, step]);

  // One timer per step, restarted on every change; a suspended step resumes with its remaining time.
  useEffect(() => {
    if (mode !== 'auto' || state.status !== 'playing') return undefined;
    clock.current = performance.now();
    const timer = window.setTimeout(() => dispatch({ type: 'TICK' }), state.remainingMs);
    return () => window.clearTimeout(timer);
  }, [mode, state.status, state.seq, state.remainingMs]);

  // Hide each leaving frame once the frame over it has faded in.
  const settleMs = state.reducedMotion ? SETTLE_REDUCED_MS : SETTLE_MS;
  useEffect(() => {
    const timers = player.leaving.flatMap((frame, track) =>
      frame ? [window.setTimeout(() => dispatch({ type: 'SETTLE', track }), settleMs)] : [],
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [player.leaving, settleMs]);

  const send = useCallback((event: GlimpseEvent) => {
    dispatch(event.type === 'PAUSE' ? { ...event, elapsedMs: performance.now() - clock.current } : event);
  }, []);

  const value = useMemo<GlimpseContextValue>(
    () => ({ playlist, player, state: player.glimpse, send, idBase }),
    [playlist, player, send, idBase],
  );

  const hoverHandlers = hoverHold
    ? {
        onPointerOver: (event: PointerEvent<HTMLDivElement>) => {
          if (event.pointerType === 'mouse') dispatch({ type: 'HOVER', track: columnOf(event.target) });
        },
        onPointerLeave: (event: PointerEvent<HTMLDivElement>) => {
          if (event.pointerType === 'mouse') dispatch({ type: 'HOVER', track: null });
        },
        onFocus: (event: FocusEvent<HTMLDivElement>) => dispatch({ type: 'HOVER', track: columnOf(event.target) }),
        onBlur: (event: FocusEvent<HTMLDivElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget)) dispatch({ type: 'HOVER', track: null });
        },
      }
    : {};

  return (
    <GlimpseContext value={value}>
      <div
        ref={rootRef}
        role="group"
        aria-label={label}
        className={className}
        data-glimpse-root=""
        data-layout={layout}
        data-status={state.status}
        data-ready={ready ? '' : undefined}
        {...hoverHandlers}
      >
        {children}
      </div>
    </GlimpseContext>
  );
}

// ─── Tracks and frames ────────────────────────────────────────────────────────────────────

export interface GlimpseTrackProps {
  readonly track: number;
  /** Brand variables per rotation (Home Citizen: Smile SAFE Taytay, then 1Hope). */
  readonly brandVars?: readonly BrandCssVars[];
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * One app's phone: its frames stack in one cell. data-paused freezes the animations inside while
 * the player is paused or suspended; the brand variables follow the rotation, on this one
 * element, so no replica re-renders.
 */
export function GlimpseTrack({ track, brandVars, children, className }: GlimpseTrackProps): ReactNode {
  const { playlist, state } = useGlimpseContext();
  const ref = useRef<HTMLDivElement>(null);
  const paused = state.status === 'paused' || state.status === 'suspended';
  const style: CSSProperties | undefined =
    brandVars && brandVars.length > 0
      ? brandVars[brandIndexForRotation(brandVars.length, trackRotation(playlist, state, track))]
      : undefined;

  useLayoutEffect(() => {
    // Resolve styles now, so the pause lands at this moment even in a hidden tab, where the
    // browser would otherwise apply it late and let the animations run ahead of the clock.
    if (paused && ref.current) void ref.current.offsetWidth;
  }, [paused]);

  return (
    <div
      ref={ref}
      className={cn('gl-track', className)}
      data-glimpse-track={track}
      data-current={track === state.track ? '' : undefined}
      data-paused={paused ? '' : undefined}
      style={style}
    >
      {children}
    </div>
  );
}

export interface GlimpseFrameProps {
  readonly track: number;
  readonly step: number;
  /** 'play' (default): the step's played state · 'poster': its static posterState. */
  readonly kind?: FrameKind;
  /**
   * Render the phone only while the player needs it (shown, fading out or coming next): the
   * reduced-motion poster frames of steps other than the poster step (frameStatus).
   */
  readonly lazy?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

/** One step of a track, as a server-rendered phone. Only its attributes change. */
export function GlimpseFrame({ track, step, kind = 'play', lazy = false, children, className }: GlimpseFrameProps): ReactNode {
  const { playlist, player, state } = useGlimpseContext();
  const ref = useRef<HTMLDivElement>(null);
  const { shown, leaving: isLeaving, next, active, frozen, mounted } = frameStatus(playlist, player, track, { step, kind }, lazy);
  const leaving = player.leaving[track] ?? null;
  const memo = useRef({ active: false, seq: -1 });

  useLayoutEffect(() => {
    // A frame that was already active and plays again (the same step chosen again, a loop, or
    // a quick return to a leaving frame) restarts from 0: the motion contract's restart.
    const element = ref.current;
    const was = memo.current;
    if (element && shown && active && was.active && was.seq !== state.seq) {
      element.removeAttribute('data-active');
      void element.offsetWidth;
      element.setAttribute('data-active', '');
    }
    memo.current = { active, seq: state.seq };
  }, [shown, active, state.seq]);

  if (!mounted) return null;
  return (
    <div
      ref={ref}
      className={cn('gl-frame', className)}
      data-step={step}
      data-kind={kind}
      data-shown={shown ? '' : undefined}
      data-enter={shown && leaving !== null ? '' : undefined}
      data-leaving={isLeaving ? '' : undefined}
      data-next={next ? '' : undefined}
      data-active={active ? '' : undefined}
      data-paused={frozen ? '' : undefined}
      aria-hidden={shown ? undefined : true}
    >
      {children}
    </div>
  );
}

// ─── Controls ─────────────────────────────────────────────────────────────────────────────

export interface GlimpseControlLabels {
  readonly pause: string;
  readonly play: string;
  readonly replay: string;
}

const DEFAULT_LABELS: GlimpseControlLabels = { pause: 'Pause preview', play: 'Play preview', replay: 'Replay preview' };

export interface GlimpseControlsProps {
  /** Button labels (defaults: Pause preview, Play preview, Replay preview). */
  readonly labels?: GlimpseControlLabels;
  /** Server-rendered icons; without them the button shows its label as text. */
  readonly icons?: { readonly pause: ReactNode; readonly play: ReactNode; readonly replay: ReactNode };
  readonly className?: string;
}

/** Pause / Play / Replay as one button: Play after a user pause or under reduced motion, Replay after the end. */
export function GlimpseControls({ labels = DEFAULT_LABELS, icons, className }: GlimpseControlsProps): ReactNode {
  const { state, send } = useGlimpseContext();
  const action = state.status === 'ended' ? 'replay' : state.userPaused ? 'play' : 'pause';
  const event: GlimpseEvent = action === 'replay' ? { type: 'REPLAY' } : action === 'play' ? { type: 'PLAY' } : { type: 'PAUSE' };
  return (
    <button
      type="button"
      className={cn(
        icons ? buttonVariants({ variant: 'icon', size: 'sm', shape: 'circle' }) : buttonVariants({ variant: 'secondary', size: 'sm' }),
        className,
      )}
      aria-label={icons ? labels[action] : undefined}
      data-glimpse-control={action}
      onClick={() => send(event)}
    >
      {icons ? icons[action] : labels[action]}
    </button>
  );
}

export interface GlimpseDotsProps {
  readonly track: number;
  readonly className?: string;
  /** 'dots' (default): step buttons · 'bars': decorative story-style progress (aria-hidden). */
  readonly look?: 'dots' | 'bars';
  /** Step names for the buttons' accessible names, e.g. "Point of sale". */
  readonly labels?: readonly string[];
  /** The buttons' group label, e.g. "SME Panindio steps". */
  readonly label?: string;
  /** Render only while this track is the current one. */
  readonly whenCurrent?: boolean;
}

/**
 * The steps of one track. Dots are buttons (24px targets, aria-current="step") that jump to a
 * step; bars are the label chip's progress, filling over each step's hold (frozen while paused).
 */
export function GlimpseDots({ track, className, look = 'dots', labels, label, whenCurrent = false }: GlimpseDotsProps): ReactNode {
  const { playlist, state, send } = useGlimpseContext();
  const count = playlist.tracks[track]?.steps.length ?? 0;
  const shownStep = shownFrame(playlist, state, track).step;
  const current = track === state.track;
  const hidden = whenCurrent && !current;

  if (look === 'bars') {
    const progressing = current && state.started && state.status !== 'ended';
    return (
      <span className={cn('gl-bars', className)} aria-hidden="true" hidden={hidden} data-glimpse-bars={track}>
        {Array.from({ length: count }, (_, index) => {
          const position = !progressing ? 'todo' : index < shownStep ? 'done' : index === shownStep ? 'current' : 'todo';
          const hold: CSSProperties & Record<'--gl-hold', string> = { '--gl-hold': `${holdOf(playlist, track, index)}ms` };
          // The fill is the bar's ::before (glimpse.css); a new key restarts it when a step plays again.
          return (
            <span
              key={position === 'current' ? `${index}-${state.seq}` : index}
              className="gl-bars__bar"
              data-position={position}
              style={hold}
            />
          );
        })}
      </span>
    );
  }

  return (
    <div role="group" aria-label={label} className={cn('gl-dots', className)} hidden={hidden} data-glimpse-dots={track}>
      {Array.from({ length: count }, (_, index) => {
        const name = labels?.[index];
        return (
          <button
            key={index}
            type="button"
            className="gl-dot"
            aria-label={`Step ${index + 1} of ${count}${name ? `: ${name}` : ''}`}
            aria-current={index === shownStep ? 'step' : undefined}
            onClick={() => send({ type: 'GOTO', track, step: index })}
          />
        );
      })}
    </div>
  );
}

// ─── Captions and per-track content ───────────────────────────────────────────────────────

export interface GlimpseCaptionProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
}

/** The FIG line region: aria-live off while rotating, polite while paused (APG carousel). */
export function GlimpseCaption({ children, className, id }: GlimpseCaptionProps): ReactNode {
  const { state } = useGlimpseContext();
  return (
    <p
      id={id}
      className={className}
      aria-live={state.status === 'playing' ? 'off' : 'polite'}
      aria-atomic="true"
      data-glimpse-caption=""
    >
      {children}
    </p>
  );
}

export interface GlimpseCaptionItemProps {
  readonly track: number;
  readonly step: number;
  readonly children: ReactNode;
}

/** One step's caption: shown while that step is the current track's shown step. */
export function GlimpseCaptionItem({ track, step, children }: GlimpseCaptionItemProps): ReactNode {
  const { playlist, state } = useGlimpseContext();
  const showing = track === state.track && shownFrame(playlist, state, track).step === step;
  return <span hidden={!showing}>{children}</span>;
}

export interface GlimpseBrandNameProps {
  readonly track: number;
  /** Index into the track's brand rotation. */
  readonly index: number;
  /** How many skins the track rotates through. */
  readonly count: number;
  readonly children: ReactNode;
}

/** Text for one brand skin of a track (e.g. " · 1Hope"), shown while that skin is on. */
export function GlimpseBrandName({ track, index, count, children }: GlimpseBrandNameProps): ReactNode {
  const { playlist, state } = useGlimpseContext();
  const showing = brandIndexForRotation(count, trackRotation(playlist, state, track)) === index;
  return <span hidden={!showing}>{children}</span>;
}

export interface GlimpseSkinNameProps {
  readonly track: number;
  /** The track's skins in rotation order, exactly as published (e.g. "Smile SAFE Taytay", "1Hope"). */
  readonly names: readonly string[];
}

/**
 * The skin a track wears now, as " · <name>": one span whose text follows the rotation (the
 * server renders the first skin, as the client does before playback). Same text as a
 * GlimpseBrandName per skin, in one element instead of one per skin.
 */
export function GlimpseSkinName({ track, names }: GlimpseSkinNameProps): ReactNode {
  const { playlist, state } = useGlimpseContext();
  const name = names[brandIndexForRotation(names.length, trackRotation(playlist, state, track))];
  return name ? <span data-glimpse-skin={track}>{` · ${name}`}</span> : null;
}

export interface GlimpseCurrentProps {
  readonly track: number;
  readonly children: ReactNode;
  readonly className?: string;
  readonly as?: 'div' | 'span';
}

/** Content for one track (its case-study link, its step dots), shown while that track is current. */
export function GlimpseCurrent({ track, children, className, as: Element = 'div' }: GlimpseCurrentProps): ReactNode {
  const { state } = useGlimpseContext();
  return (
    <Element className={className} hidden={track !== state.track} data-glimpse-current={track}>
      {children}
    </Element>
  );
}

export interface GlimpseColumnProps {
  readonly track: number;
  readonly children: ReactNode;
  readonly className?: string;
}

/** A trio column (label chip and linked phone): data-current marks the app that plays. */
export function GlimpseColumn({ track, children, className }: GlimpseColumnProps): ReactNode {
  const { state } = useGlimpseContext();
  return (
    <li className={className} data-glimpse-column={track} data-current={track === state.track ? '' : undefined}>
      {children}
    </li>
  );
}

export interface GlimpsePickerProps {
  /** The radio group's (visually hidden) legend, e.g. "Show app". */
  readonly legend: string;
  /** One option per track: a short label and a fuller accessible name ("SME" → "SME Panindio"). */
  readonly options: readonly { readonly label: string; readonly srLabel?: string }[];
  readonly className?: string;
}

/** The single-phone app picker (design §5.3): native radios that jump to a track. */
export function GlimpsePicker({ legend, options, className }: GlimpsePickerProps): ReactNode {
  const { state, send, idBase } = useGlimpseContext();
  const choices: SegmentedOption<string>[] = options.map((option, index) => ({
    value: String(index),
    label: option.label,
    srLabel: option.srLabel,
  }));
  return (
    <SegmentedControl
      name={`${idBase}-app`}
      legend={legend}
      legendHidden
      options={choices}
      value={String(state.track)}
      onValueChange={(value) => send({ type: 'GOTO', track: Number(value), step: 0 })}
      size="sm"
      className={className}
    />
  );
}
