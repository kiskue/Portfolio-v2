import { Expand, Navigation } from 'lucide-react';
import type { ReactNode } from 'react';
import { pickState, RMapCanvas, type ReplicaProps } from '@/components/replicas/kit';
import { DistanceCard, type DistanceTimeline } from '@/components/replicas/responder/parts/distance-card';
import { DispatchFooter, type TicketStage } from '@/components/replicas/responder/parts/dispatch-footer';
import { DispatchSheet, FAB_BOTTOM } from '@/components/replicas/responder/parts/dispatch-sheet';
import { EtaRibbon, GlassStack, MapFab, MapFabStack, VehicleCard } from '@/components/replicas/responder/parts/map-chrome';
import { MapHeader } from '@/components/replicas/responder/parts/map-header';
import { MapScreen } from '@/components/replicas/responder/parts/map-screen';
import { ZONES, zoneFor, type ZoneKey } from '@/components/replicas/responder/parts/palette';
import { ResponderPuck } from '@/components/replicas/responder/parts/responder-puck';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import { countFrames, NAV_TIMELINE } from '@/components/replicas/responder/parts/timeline';
import { incidentPin, responderDistance, responderScenes } from '@/components/replicas/responder/sample-data';
import type { FigureState } from '@/content/apps/figures';

/**
 * The zone of each state comes from its straight-line distance (the app's thresholds), and
 * 'on-site' plays the drive while active (1,240 m FAR → 80 m NEAR → 18 m ON SITE, then ADD
 * UPDATE / RESOLVE once arrival is recorded).
 */
const VIEWS = {
  far: { distance: responderDistance.far, stage: 'en-route', animated: false },
  near: { distance: responderDistance.near, stage: 'en-route', animated: false },
  'on-site': { distance: responderDistance.onSite, stage: 'arrived', animated: true },
} as const satisfies Record<FigureState<'3.3'>, { readonly distance: number; readonly stage: TicketStage; readonly animated: boolean }>;

const STATES = stateTuple(VIEWS);

/** The glimpse's drive: the zone flips first, then the number eases down (as the app's card counts). */
const DRIVE: DistanceTimeline = {
  zones: [
    { atMs: 0, zone: zoneFor(responderDistance.far) },
    { atMs: NAV_TIMELINE.nearAt, zone: zoneFor(responderDistance.near) },
    { atMs: NAV_TIMELINE.onSiteAt, zone: zoneFor(responderDistance.onSite) },
  ],
  counts: [
    [0, responderDistance.far],
    ...countFrames(responderDistance.far, responderDistance.near, NAV_TIMELINE.nearAt, 900, 5).slice(1),
    ...countFrames(responderDistance.near, responderDistance.onSite, NAV_TIMELINE.onSiteAt, 600, 3).slice(1),
  ],
};

/** The route recolours with the zone while active; its poster colour is the final zone. */
const RECOLOR = DRIVE.zones.map(({ atMs, zone }) => ({ atMs, color: ZONES[zone].color }));

/**
 * FIG 3.3 Navigate to incident: the tilted 3D-follow map with the zone-coloured road route, the
 * ETA ribbon (6 min · 2.4 km), the vehicle card, the puck pinned in the lower third, and the
 * sheet at 50% with JOIN STREAM, the distance card and CANCEL / ARRIVE.
 */
export function NavigateToIncidentScreen({ state }: ReplicaProps): ReactNode {
  const view = VIEWS[pickState(STATES, state)];
  const zone: ZoneKey = zoneFor(view.distance);
  const { puck, heading, scene } = responderScenes.incident;
  const color = ZONES[zone].color;
  return (
    <MapScreen
      map={
        <RMapCanvas
          theme="light"
          height="full"
          tilt
          traffic
          pins={[incidentPin(scene)]}
          route={{ path: 'en-route', color, width: 5, ...(view.animated ? { recolorAt: RECOLOR } : {}) }}
          className="rx-responder-map"
        />
      }
      puck={<ResponderPuck x={puck.x} y={puck.y} heading={heading.nav} moving />}
      header={<MapHeader duty="online" />}
      overlay={
        <DispatchSheet
          snap="half"
          stage={view.stage}
          footer={<DispatchFooter stage={view.stage} arrivesAt={view.animated ? NAV_TIMELINE.arrivedAt : undefined} />}
        >
          <DistanceCard zone={zone} distance={view.distance} timeline={view.animated ? DRIVE : undefined} />
        </DispatchSheet>
      }
    >
      <GlassStack>
        <EtaRibbon />
        <VehicleCard />
      </GlassStack>
      <MapFabStack bottom={FAB_BOTTOM.half}>
        <MapFab icon={Expand} />
        <MapFab icon={Navigation} active filled />
      </MapFabStack>
    </MapScreen>
  );
}
