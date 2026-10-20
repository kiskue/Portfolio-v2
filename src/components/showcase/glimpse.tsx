// STUB — owned by W7, replaced in wave 2a
import type { ReactNode } from 'react';
import {
  GlimpseControls,
  GlimpseDots,
  GlimpseFrame,
  GlimpseRoot,
  GlimpseTrack,
} from '@/components/showcase/glimpse.client';
import type { PhoneSize } from '@/components/showcase/phone-frame';
import { ScreenView } from '@/components/showcase/screen-view';
import { glimpseById } from '@/content/derived';
import type { GlimpseId } from '@/content/types';

/**
 * The compound client parts as one namespace (Glimpse.Root, .Track, .Frame, .Controls,
 * .Dots). It is built here, on the server side, because a Server Component may not dot into a
 * 'use client' module (React throws "Cannot access Glimpse.Root on the server").
 */
export const Glimpse = {
  Root: GlimpseRoot,
  Track: GlimpseTrack,
  Frame: GlimpseFrame,
  Controls: GlimpseControls,
  Dots: GlimpseDots,
} as const;

export interface GlimpsePlayerProps {
  /** One track per glimpse: three on Home (trio), one in a case-study hero. */
  readonly glimpses: readonly GlimpseId[];
  readonly layout: 'trio' | 'hero' | 'single';
  readonly size: PhoneSize | 'inherit';
}

/**
 * Plays each glimpse's steps in phone frames (design §5.3). Stub: renders each glimpse's
 * poster step statically through ScreenView.
 */
export function GlimpsePlayer({ glimpses, layout, size }: GlimpsePlayerProps): ReactNode {
  return (
    <div className="flex flex-wrap items-end justify-center gap-4" data-glimpse-player="" data-layout={layout}>
      {glimpses.map((id) => {
        const glimpse = glimpseById(id);
        const step = glimpse.steps[glimpse.posterStep] ?? glimpse.steps[0];
        return (
          <ScreenView
            key={id}
            source={{ kind: 'replica', figure: step.figure, state: step.posterState ?? step.state }}
            size={size}
          />
        );
      })}
    </div>
  );
}
