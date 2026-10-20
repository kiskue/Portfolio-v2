import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

export interface RCallBackdropProps extends RBoxProps {
  /**
   * citizen: diagonal #1a1a2e → #16213e → #0f3460 (before the camera starts).
   * responder: vertical #0B1220 → #122038 → #0C2D52 with a bottom vignette.
   */
  readonly palette: 'citizen' | 'responder';
  /** Black scrim opacity over the backdrop, 0–1 (default 0.4 for Citizen, none for Responder). */
  readonly scrim?: number;
  /** Two large blurred orbs in the caller's role colour, pulsing while active. */
  readonly orbs?: RColor;
  /** A blurred, featureless head-and-shoulders shape standing in for video. */
  readonly silhouette?: boolean;
}

/**
 * The call-screen background: an abstract gradient, optional orbs and an optional blurred
 * silhouette. Never a photo or likeness of a person. Fills the canvas behind the call UI.
 */
export function RCallBackdrop({ palette, scrim, orbs, silhouette, className, style }: RCallBackdropProps): ReactNode {
  const scrimAlpha = scrim ?? (palette === 'citizen' ? 0.4 : 0);
  return (
    <div className={cn('rx-callbg', className)} data-palette={palette} style={style}>
      {orbs ? (
        <>
          <span className="rx-callbg__orb" data-i="0" style={{ background: orbs }} />
          <span className="rx-callbg__orb" data-i="1" style={{ background: orbs }} />
        </>
      ) : null}
      {silhouette ? (
        <svg className="rx-callbg__figure" viewBox="0 0 300 340" aria-hidden="true">
          <circle cx="150" cy="110" r="72" fill="#cbd5e1" />
          <path d="M18 340c0-86 59-138 132-138s132 52 132 138z" fill="#94a3b8" />
        </svg>
      ) : null}
      {scrimAlpha > 0 ? <span className="rx-callbg__scrim" style={rStyle({}, { background: `rgb(0 0 0 / ${scrimAlpha})` })} /> : null}
      {palette === 'responder' ? <span className="rx-callbg__vignette" /> : null}
    </div>
  );
}
