import { MapPinned, MessageSquare, Navigation2, Phone, Radio, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { DISPATCH } from './palette';
import { PulsingDot } from './pulsing-dot';

/**
 * The dispatch sheet's navy header band (#085499 in every brand): the pulsing LIVE chip,
 * "ACTIVE DISPATCH" over "NEW EMERGENCY", and once accepted the cyan JOIN STREAM pill.
 */
export function DispatchBand({ join }: { readonly join: boolean }): ReactNode {
  return (
    <div className="rx-responder-band">
      <span className="rx-responder-band__lead">
        <span className="rx-responder-live">
          <PulsingDot color={DISPATCH.live} size={7} />
          <span>LIVE</span>
        </span>
        <span className="rx-responder-band__titles">
          <span className="rx-responder-band__eyebrow">ACTIVE DISPATCH</span>
          <span className="rx-responder-band__title">NEW EMERGENCY</span>
        </span>
      </span>
      {join ? (
        <span className="rx-responder-join">
          <RGlyph icon={Radio} size={14} />
          <span>JOIN STREAM</span>
        </span>
      ) : null}
    </div>
  );
}

interface ToolTileProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly glyph: string;
  readonly size?: number;
  readonly disabled?: boolean;
  readonly filled?: boolean;
}

/** A toolbar tile: min-width 64, radius 12, cyan 7% fill and 16% edge, 9px SemiBold cyan label. */
function ToolTile({ icon, label, glyph, size = 18, disabled, filled }: ToolTileProps): ReactNode {
  return (
    <span className="rx-responder-tile" data-disabled={disabled ? '' : undefined}>
      <RGlyph icon={icon} size={size} color={glyph} fill={filled ? glyph : undefined} />
      <span className="rx-responder-tile__label">{label}</span>
    </span>
  );
}

/**
 * The toolbar under the band: Maps and Waze | Chat and Call. Chat and Call stay grey at 50%
 * until the ticket is accepted.
 */
export function DispatchToolbar({ accepted }: { readonly accepted: boolean }): ReactNode {
  return (
    <div className="rx-responder-toolbar">
      <span className="rx-responder-toolbar__group">
        <ToolTile icon={MapPinned} label="Maps" glyph={DISPATCH.navy} />
        <ToolTile icon={Navigation2} label="Waze" glyph={DISPATCH.cyan} size={20} />
      </span>
      <span className="rx-responder-toolbar__divider" />
      <span className="rx-responder-toolbar__group">
        <ToolTile icon={MessageSquare} label="Chat" glyph={accepted ? DISPATCH.chat : DISPATCH.disabled} disabled={!accepted} />
        <ToolTile icon={Phone} label="Call" glyph={accepted ? DISPATCH.call : DISPATCH.disabled} disabled={!accepted} filled />
      </span>
    </div>
  );
}
