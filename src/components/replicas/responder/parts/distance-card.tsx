import { ChevronsRight, LocateFixed } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RStateSequence, rStyle } from '@/components/replicas/kit';
import { metres } from '@/components/replicas/responder/sample-data';
import { ZONES, type ZoneKey } from './palette';
import { PulsingDot } from './pulsing-dot';

/** Zone-coloured parts read --rx-responder-zone (fill 10%, edge 28%, as the app's zone tokens). */
function zoneVars(zone: ZoneKey) {
  return rStyle({ '--rx-responder-zone': ZONES[zone].color });
}

/** The zone pill: pulsing dot, "FAR" 10px Bold, "· Distance critical" 9px. */
export function ZoneBadge({ zone }: { readonly zone: ZoneKey }): ReactNode {
  const { label, sublabel, color } = ZONES[zone];
  return (
    <span className="rx-responder-zone" style={zoneVars(zone)}>
      <PulsingDot color={color} size={6} />
      <span className="rx-responder-zone__label">{label}</span>
      <span className="rx-responder-zone__sub">{`· ${sublabel}`}</span>
    </span>
  );
}

function ZoneTile({ zone }: { readonly zone: ZoneKey }): ReactNode {
  return (
    <span className="rx-responder-dcard__tile" style={zoneVars(zone)}>
      <RGlyph icon={LocateFixed} size={20} />
    </span>
  );
}

function ZoneStrip({ zone }: { readonly zone: ZoneKey }): ReactNode {
  return <span className="rx-responder-dcard__strip" style={zoneVars(zone)} />;
}

/** In-card animation for a glimpse: zone changes and the counted distance, each as [atMs, value]. */
export interface DistanceTimeline {
  readonly zones: readonly { readonly atMs: number; readonly zone: ZoneKey }[];
  readonly counts: readonly (readonly [number, number])[];
}

export interface DistanceCardProps {
  readonly zone: ZoneKey;
  readonly distance: number;
  /** Animate while active; the poster is the last zone and count. */
  readonly timeline?: DistanceTimeline;
}

/** "1,240 m": the 30px Bold number with its unit, so a counted frame keeps the unit beside it. */
function Distance({ value }: { readonly value: number }): ReactNode {
  return (
    <span className="rx-responder-dcard__dist">
      <span className="rx-responder-dcard__count">{metres(value)}</span>
      <span className="rx-responder-dcard__unit">m</span>
    </span>
  );
}

/** Zone frames as an RStateSequence whose poster is the last frame. Zones switch at once, as in the app. */
function zoneSequence(timeline: DistanceTimeline, draw: (zone: ZoneKey) => ReactNode, className?: string): ReactNode {
  return (
    <RStateSequence
      className={className}
      frames={timeline.zones.map(({ atMs, zone }) => ({ atMs, node: draw(zone) }))}
      posterFrame={timeline.zones.length - 1}
      fadeMs={0}
    />
  );
}

/**
 * DISTANCE TO EMERGENCY (DistanceCard): a white radius-16 card with a 2px zone strip centred on
 * top, a 46px zone tile with the my-location glyph, the 30px Bold distance, the zone pill and
 * the cyan VIEW UPDATES pill.
 */
export function DistanceCard({ zone, distance, timeline }: DistanceCardProps): ReactNode {
  const number = timeline ? (
    <RStateSequence
      frames={timeline.counts.map(([atMs, value]) => ({ atMs, node: <Distance value={value} /> }))}
      posterFrame={timeline.counts.length - 1}
      fadeMs={0}
    />
  ) : (
    <Distance value={distance} />
  );
  return (
    <div className="rx-responder-dcard-wrap">
      <div className="rx-responder-dcard" style={zoneVars(zone)}>
        {timeline ? zoneSequence(timeline, (z) => <ZoneStrip zone={z} />, 'rx-responder-dcard__strip-seq') : <ZoneStrip zone={zone} />}
        <span className="rx-responder-dcard__row">
          {timeline ? zoneSequence(timeline, (z) => <ZoneTile zone={z} />) : <ZoneTile zone={zone} />}
          <span className="rx-responder-dcard__text">
            <span className="rx-responder-dcard__heading">DISTANCE TO EMERGENCY</span>
            {number}
            {timeline ? zoneSequence(timeline, (z) => <ZoneBadge zone={z} />, 'rx-responder-dcard__badge-seq') : <ZoneBadge zone={zone} />}
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
