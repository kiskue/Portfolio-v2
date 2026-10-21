import { Expand, Navigation } from 'lucide-react';
import type { ReactNode } from 'react';
import { type MapSceneKey, pickState, RMapCanvas, type ReplicaProps } from '@/components/replicas/kit';
import { DistanceCard, type DistanceDrive } from '@/components/replicas/responder/parts/distance-card';
import { DispatchFooter, type TicketStage } from '@/components/replicas/responder/parts/dispatch-footer';
import { DispatchSheet, FAB_BOTTOM } from '@/components/replicas/responder/parts/dispatch-sheet';
import { EtaRibbon, GlassStack, MapFab, MapFabStack, VehicleCard } from '@/components/replicas/responder/parts/map-chrome';
import { MapHeader } from '@/components/replicas/responder/parts/map-header';
import { NAV_FOLLOW, titledIncident } from '@/components/replicas/responder/parts/map-scene';
import { MapScreen } from '@/components/replicas/responder/parts/map-screen';
import { ZONE_LIMITS, zoneFor } from '@/components/replicas/responder/parts/palette';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import { countFrames, NAV_TIMELINE } from '@/components/replicas/responder/parts/timeline';
import { responderDistance } from '@/components/replicas/responder/sample-data';
import type { FigureState } from '@/content/apps/figures';

/**
 * Each state is a moment of the town's 'en-route' scenes (the puck on the road route, the route in
 * the zone colour, the incident ahead). 'far' is the glimpse step (far → on-site): while active
 * the puck drives to 18 m, the route and the card turn CLOSE, NEAR and ON SITE, the distance
 * counts down and the footer becomes ADD UPDATE / RESOLVE. Its static picture stays FAR.
 */
const VIEWS = {
  far: { scene: 'en-route', distance: responderDistance.far, stage: 'en-route', drives: true },
  near: { scene: 'en-route-near', distance: responderDistance.near, stage: 'en-route', drives: false },
  'on-site': { scene: 'en-route-on-site', distance: responderDistance.onSite, stage: 'arrived', drives: false },
} as const satisfies Record<
  FigureState<'3.3'>,
  { readonly scene: MapSceneKey; readonly distance: number; readonly stage: TicketStage; readonly drives: boolean }
>;

const STATES = stateTuple(VIEWS);

/** The straight-line distance at each zone moment of the drive (CLOSE as it crosses 500 m). */
const ANCHORS = [
  [NAV_TIMELINE.startAt, responderDistance.far],
  [NAV_TIMELINE.closeAt, ZONE_LIMITS.close],
  [NAV_TIMELINE.nearAt, responderDistance.near],
  [NAV_TIMELINE.onSiteAt, responderDistance.onSite],
] as const;

/**
 * The card's side of the drive: the zone flips at each moment and the number takes two readings
 * per leg between them (the app's card counts toward each GPS fix; a fix comes every 10 m or 5 s).
 */
const DRIVE: DistanceDrive = {
  zones: [{ atMs: 0, zone: zoneFor(responderDistance.far) }, ...ANCHORS.slice(1).map(([atMs, metres]) => ({ atMs, zone: zoneFor(metres) }))],
  counts: [[0, responderDistance.far], ...countFrames(ANCHORS, 2).slice(1)],
};

/**
 * FIG 3.3 Navigate to incident: the tilted 3D-follow map with the zone-coloured road route (the
 * puck pinned where the app's nav camera keeps it above the half sheet), the ETA ribbon
 * (6 min · 2.4 km), the vehicle card, and the sheet at 50% with JOIN STREAM, the distance card
 * and CANCEL / ARRIVE.
 */
export function NavigateToIncidentScreen({ state }: ReplicaProps): ReactNode {
  const view = VIEWS[pickState(STATES, state)];
  return (
    <MapScreen
      map={
        <RMapCanvas theme="light" height="full" scene={view.scene} pins={titledIncident(view.scene)} follow={NAV_FOLLOW} className="rx-responder-map" />
      }
      header={<MapHeader duty="online" />}
      overlay={
        <DispatchSheet
          snap="half"
          stage={view.stage}
          footer={<DispatchFooter stage={view.stage} arrivesAt={view.drives ? NAV_TIMELINE.arrivedAt : undefined} />}
        >
          <DistanceCard zone={zoneFor(view.distance)} distance={view.distance} drive={view.drives ? DRIVE : undefined} />
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
