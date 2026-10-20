// STUB — owned by W7, replaced in wave 2a
'use client';

import { createContext, use, type ReactNode } from 'react';
import type { BrandCssVars } from '@/lib/brand-vars';

/*
 * The client half of the glimpse player (architecture D4): compound parts sharing one context.
 * They only flip attributes on server-rendered steps (data-active, data-paused, data-next;
 * see the motion contract in src/styles/replica.css). Server code imports them through the
 * `Glimpse` namespace in glimpse.tsx: a Server Component cannot dot into a client module.
 *
 * The stub shows each track's poster step and never animates.
 */

/** Mirrors src/lib/glimpse.ts (W7 moves it there): one track per app, steps with hold times. */
export interface Playlist {
  readonly tracks: readonly {
    readonly steps: readonly { readonly holdMs: number }[];
    readonly posterStep: number;
    readonly rotations?: number;
  }[];
  /** 2 on Home. */
  readonly maxRotations: number;
  readonly reducedMotion: boolean;
}

interface GlimpseContextValue {
  readonly playlist: Playlist;
  readonly track: number;
  readonly step: number;
}

const GlimpseContext = createContext<GlimpseContextValue | null>(null);

function useGlimpseContext(): GlimpseContextValue {
  const value = use(GlimpseContext);
  if (value === null) throw new Error('Glimpse parts must be rendered inside Glimpse.Root');
  return value;
}

export interface GlimpseRootProps {
  readonly playlist: Playlist;
  /** auto: timed playback · controlled: the step comes from `step`. */
  readonly mode: 'auto' | 'controlled';
  readonly step?: number;
  /** Accessible name of the whole preview (Glimpse.label). */
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function GlimpseRoot({ playlist, mode, step, label, children, className }: GlimpseRootProps): ReactNode {
  const poster = playlist.tracks[0]?.posterStep ?? 0;
  const current = mode === 'controlled' && step !== undefined ? step : poster;
  return (
    <GlimpseContext value={{ playlist, track: 0, step: current }}>
      <div role="group" aria-label={label} className={className} data-glimpse-root="">
        {children}
      </div>
    </GlimpseContext>
  );
}

export interface GlimpseTrackProps {
  readonly track: number;
  /** Brand variables per rotation (Home Citizen: Smile SAFE Taytay, then 1Hope). */
  readonly brandVars?: readonly BrandCssVars[];
  readonly children: ReactNode;
  readonly className?: string;
}

export function GlimpseTrack({ track, brandVars, children, className }: GlimpseTrackProps): ReactNode {
  return (
    <div className={className} data-track={track} style={brandVars?.[0]}>
      {children}
    </div>
  );
}

export interface GlimpseFrameProps {
  readonly track: number;
  readonly step: number;
  readonly children: ReactNode;
  readonly className?: string;
}

export function GlimpseFrame({ track, step, children, className }: GlimpseFrameProps): ReactNode {
  const { playlist } = useGlimpseContext();
  const poster = playlist.tracks[track]?.posterStep ?? 0;
  return (
    <div className={className} data-step={step} hidden={step !== poster}>
      {children}
    </div>
  );
}

export interface GlimpseControlsProps {
  /** Button labels (defaults: Pause preview, Play preview, Replay preview). */
  readonly labels?: { readonly pause: string; readonly play: string; readonly replay: string };
  readonly className?: string;
}

/** Pause / Play / Replay. The stub never plays, so it renders an empty slot. */
export function GlimpseControls({ className }: GlimpseControlsProps): ReactNode {
  return <div className={className} data-glimpse-controls="" />;
}

export interface GlimpseDotsProps {
  readonly track: number;
  readonly className?: string;
}

/** The story-style progress bars for one track. The stub renders an empty slot. */
export function GlimpseDots({ track, className }: GlimpseDotsProps): ReactNode {
  return <div className={className} data-glimpse-dots={track} />;
}
