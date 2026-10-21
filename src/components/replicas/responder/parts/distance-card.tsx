import { ChevronsRight, LocateFixed } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { ms, RGlyph, RStateSequence, rStyle } from '@/components/replicas/kit';
import { metres } from '@/components/replicas/responder/sample-data';
import { ZONES, type ZoneKey } from './palette';
import { PulsingDot } from './pulsing-dot';

/** The most zone changes a drive can play (responder.css declares the matching animations). */
const MAX_ZONE_CHANGES = 3;

/** A drive for the glimpse: zone changes and the counted distance, each as [atMs, value]. */
export interface DistanceDrive {
  /** The zones in order; the first is the static zone at 0 ms. */
  readonly zones: readonly { readonly atMs: number; readonly zone: ZoneKey }[];
  /** Distance readings in metres; the first is the static reading at 0 ms. */
  readonly counts: readonly (readonly [number, number])[];
}

export interface DistanceCardProps {
  readonly zone: ZoneKey;
  readonly distance: number;
  /** Play the drive while active; the static picture stays `zone` and `distance`. */
  readonly drive?: DistanceDrive;
}

/**
 * The card's colour is the zone colour, and every zone-coloured part (the strip, the tile, the
 * pill and its dot) reads currentColor. A drive recolours the card at each zone change while
 * active (one animation per change, later changes win), so the parts follow without extra markup.
 */
function cardStyle(zone: ZoneKey, drive: DistanceDrive | undefined): CSSProperties | undefined {
  const vars: Record<`--${string}`, string> = {};
  drive?.zones.slice(1, MAX_ZONE_CHANGES + 1).forEach((change, index) => {
    vars[`--rx-responder-z${index + 1}`] = ZONES[change.zone].color;
    vars[`--rx-responder-z${index + 1}-at`] = ms(change.atMs);
  });
  return rStyle(vars, { color: ZONES[zone].color });
}

/** The zone pill's words: "FAR" 10px Bold and, after it, "· Distance critical" 9px (its ::after). */
function ZoneWords({ zone }: { readonly zone: ZoneKey }): ReactNode {
  return (
    <span className="rx-responder-zone__label" data-sub={`· ${ZONES[zone].sublabel}`}>
      {ZONES[zone].label}
    </span>
  );
}

/**
 * DISTANCE TO EMERGENCY (DistanceCard): a white radius-16 card with a 2px zone strip centred on
 * top, a 46px zone tile with the my-location glyph, the 30px Bold distance with its 13px unit
 * (the count's ::after, so a counted reading keeps the unit beside it), the zone pill and the
 * cyan VIEW UPDATES pill. Zones switch at once, as in the app.
 */
export function DistanceCard({ zone, distance, drive }: DistanceCardProps): ReactNode {
  const changes = drive ? Math.min(drive.zones.length - 1, MAX_ZONE_CHANGES) : 0;
  return (
    <div className="rx-responder-dcard-wrap">
      <div className="rx-responder-dcard" data-drive={changes > 0 ? String(changes) : undefined} style={cardStyle(zone, drive)}>
        <span className="rx-responder-dcard__strip" />
        <span className="rx-responder-dcard__row">
          <span className="rx-responder-dcard__tile">
            <RGlyph icon={LocateFixed} size={20} />
          </span>
          <span className="rx-responder-dcard__text">
            <span className="rx-responder-dcard__heading">DISTANCE TO EMERGENCY</span>
            {drive ? (
              <RStateSequence
                className="rx-responder-dcard__count"
                frames={drive.counts.map(([atMs, value]) => ({ atMs, node: metres(value) }))}
                fadeMs={0}
              />
            ) : (
              <span className="rx-responder-dcard__count">{metres(distance)}</span>
            )}
            <span className="rx-responder-zone">
              <PulsingDot color="currentColor" size={6} />
              {drive ? (
                <RStateSequence frames={drive.zones.map(({ atMs, zone: at }) => ({ atMs, node: <ZoneWords zone={at} /> }))} fadeMs={0} />
              ) : (
                <ZoneWords zone={zone} />
              )}
            </span>
          </span>
          <span className="rx-responder-updates">
            <span>VIEW UPDATES</span>
            <RGlyph icon={ChevronsRight} size={14} />
          </span>
        </span>
      </div>
    </div>
  );
}
