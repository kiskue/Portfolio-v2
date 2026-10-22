import { House, type LucideIcon, Store, TriangleAlert } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { KitGlyph } from './kit-glyph';
import type { MapLabelSide, MapPin, MapPinKind, MapPinLook, RMapPuck } from './map-scenes';

/*
 * Map markers: the pins and the heading-aware puck, drawn as inline SVG inside spans. A marker is
 * a fixed box whose anchor (an inner 0×0 span) sits on its town point; the art hangs off the
 * anchor, and rotations and scaling turn about it (map.css sets the matching transform-origin).
 * The box is large enough to hold the art and label: Chrome paints a 3D-transformed element (a
 * pin standing up on the tilted map) only inside its own box.
 */

/** The pin box, and where its anchor sits in it (map.css uses the same numbers). */
export const MAP_PIN_BOX = { width: 360, height: 116, anchorX: 180, anchorY: 76 } as const;

/** The puck box (holds the 64 px halo and its pulse); the anchor is its centre. */
export const MAP_PUCK_BOX = 100;

export interface MapPinStyle {
  readonly look: MapPinLook;
  readonly color: string;
  readonly icon?: LucideIcon;
}

/** Each pin kind's default look, colour and glyph (the apps' native markers). */
export const MAP_PIN_DEFAULTS: Readonly<Record<MapPinKind, MapPinStyle>> = {
  you: { look: 'dot', color: 'var(--rx-map-you)' },
  hazard: { look: 'pin', color: '#d84343' },
  incident: { look: 'pin', color: '#ef4444', icon: TriangleAlert },
  peer: { look: 'pin', color: '#16a34a' },
  store: { look: 'pin', color: '#1E4D8C', icon: Store },
  home: { look: 'pin', color: '#27AE60', icon: House },
  rider: { look: 'badge', color: '#0EA5E9' },
};

/** The pin silhouette in a 28×40 box, tip at (14, 39), head centre (14, 13.5). */
const TEARDROP = 'M14 39C10.6 33.2 1.5 24.6 1.5 13.5A12.5 12.5 0 0 1 26.5 13.5C26.5 24.6 17.4 33.2 14 39Z';

/** Top-down glyphs in a 100×100 box, centred on (50, 57) like the Responder puck plate. */
function PuckGlyph({ glyph }: { readonly glyph: RMapPuck['glyph'] }): ReactNode {
  if (glyph === 'van') {
    return (
      <g>
        <rect x="33" y="31" width="34" height="52" rx="9" className="rx-map-puck__ink" />
        <rect x="38" y="36" width="24" height="11" rx="4" className="rx-map-puck__cut" />
        <rect x="38" y="52" width="24" height="4" rx="2" className="rx-map-puck__cut" />
        <rect x="38" y="67" width="24" height="9" rx="4" className="rx-map-puck__cut" />
      </g>
    );
  }
  if (glyph === 'moto') {
    // A rider on a motorcycle from above: front wheel, handlebar, shoulders and helmet, rear wheel.
    return (
      <g>
        <rect x="46" y="20" width="8" height="17" rx="4" className="rx-map-puck__ink" />
        <rect x="31" y="35" width="38" height="6" rx="3" className="rx-map-puck__ink" />
        <ellipse cx="50" cy="56" rx="16" ry="10" className="rx-map-puck__ink" />
        <circle cx="50" cy="54" r="8.5" className="rx-map-puck__helmet" strokeWidth="3" />
        <rect x="44" y="64" width="12" height="13" rx="5" className="rx-map-puck__ink" />
        <rect x="46" y="76" width="8" height="15" rx="4" className="rx-map-puck__ink" />
      </g>
    );
  }
  return <path d="M50 30 68 79 50 69 32 79Z" className="rx-map-puck__ink" />;
}

export interface MapPuckArtProps {
  readonly puck: RMapPuck;
  readonly look: 'plate' | 'badge';
  readonly size: number;
}

/**
 * The puck art, pointing north. 'plate' ports the Responder puck (a disc with a nose arrow, a
 * solid ring and a mode glyph; ResponderPuckArt); 'badge' is the SME rider marker, a round
 * badge whose glyph shows the heading.
 */
export function MapPuckArt({ puck, look, size }: MapPuckArtProps): ReactNode {
  const halo = puck.halo ?? look === 'plate';
  return (
    <span className="rx-map-puck__anchor">
      {halo ? <span className="rx-map-puck__halo" /> : null}
      {halo ? <span className="rx-map-puck__pulse" /> : null}
      <svg className="rx-map-puck__art" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        {look === 'plate' ? (
          <>
            <path d="M50 6 36 32h28z" className="rx-map-puck__plate" strokeWidth="5" strokeLinejoin="round" />
            <circle cx="50" cy="57" r="38" className="rx-map-puck__plate" strokeWidth="5" />
            <PuckGlyph glyph={puck.glyph} />
          </>
        ) : (
          <>
            <circle cx="50" cy="50" r="44" className="rx-map-puck__plate" strokeWidth="7" />
            <g transform="translate(0 -7)">
              <PuckGlyph glyph={puck.glyph} />
            </g>
          </>
        )}
      </svg>
    </span>
  );
}

export interface MapPinMarkProps {
  readonly pin: MapPin;
  readonly side: MapLabelSide;
  /** The transform that places the marker's anchor on its town point (set by RMapCanvas). */
  readonly transform: string;
}

/** The pin's art: a teardrop with a core dot or glyph, the location dot, or a round badge. */
function PinArt({ look, icon }: { readonly look: MapPinLook; readonly icon: LucideIcon | undefined }): ReactNode {
  if (look === 'dot') return <span className="rx-map-pin__dot" />;
  if (look === 'pin') {
    return (
      <svg className="rx-map-pin__art" width="28" height="40" viewBox="0 0 28 40" aria-hidden="true">
        <path d={TEARDROP} className="rx-map-pin__shape" />
        {icon ? null : <circle cx="14" cy="13.5" r="4.6" className="rx-map-pin__core" />}
      </svg>
    );
  }
  return (
    <svg className="rx-map-pin__art" width="36" height="36" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" className="rx-map-pin__shape" strokeWidth="7" />
      {icon ? null : (
        <g transform="translate(0 -7)">
          <PuckGlyph glyph="moto" />
        </g>
      )}
    </svg>
  );
}

/** One pin: a teardrop, the location dot or a badge, with an optional label. */
export function MapPinMark({ pin, side, transform }: MapPinMarkProps): ReactNode {
  const defaults = MAP_PIN_DEFAULTS[pin.kind];
  const look = pin.look ?? defaults.look;
  const icon = pin.icon ?? (look === defaults.look ? defaults.icon : undefined);
  const color = pin.color ?? defaults.color;
  const pulse = pin.pulse ?? look === 'dot';
  const style = { transform, '--rx-map-pin-c': color } as CSSProperties;
  return (
    <span className="rx-map-pin" data-kind={pin.kind} data-look={look} style={style}>
      <span className="rx-map-pin__anchor">
        {pulse ? <span className="rx-map-pin__pulse" /> : null}
        <PinArt look={look} icon={icon} />
        {icon && look !== 'dot' ? (
          <KitGlyph icon={icon} size={look === 'pin' ? 13 : 18} strokeWidth={2.4} color="#ffffff" className="rx-map-pin__glyph" />
        ) : null}
        {pin.label ? (
          <span className="rx-map-pin__label" data-side={side}>
            {pin.label}
          </span>
        ) : null}
      </span>
    </span>
  );
}
