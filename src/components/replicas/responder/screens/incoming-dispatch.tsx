import { CircleAlert, Expand, LocateFixed } from 'lucide-react';
import type { ReactNode } from 'react';
import { pickState, RMapCanvas, RToast, type ReplicaProps } from '@/components/replicas/kit';
import { DistanceCard } from '@/components/replicas/responder/parts/distance-card';
import { DispatchFooter } from '@/components/replicas/responder/parts/dispatch-footer';
import { DispatchSheet, FAB_BOTTOM, type SheetSnap } from '@/components/replicas/responder/parts/dispatch-sheet';
import { IncidentInfoCard } from '@/components/replicas/responder/parts/incident-info-card';
import { EtaRibbon, GlassStack, MapFab, MapFabStack, VehicleCard } from '@/components/replicas/responder/parts/map-chrome';
import { MapHeader } from '@/components/replicas/responder/parts/map-header';
import { MapScreen } from '@/components/replicas/responder/parts/map-screen';
import { ZONES, zoneFor } from '@/components/replicas/responder/parts/palette';
import { ResponderPuck } from '@/components/replicas/responder/parts/responder-puck';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import { DISPATCH_TIMELINE } from '@/components/replicas/responder/parts/timeline';
import { incidentPin, responderDistance, responderScenes } from '@/components/replicas/responder/sample-data';
import type { FigureState } from '@/content/apps/figures';

/**
 * 'sheet': the responder has dragged the sheet to its 85% snap to read the ticket.
 * 'toast': the moment of assignment: the toast drops in and the sheet rises to 50% while active.
 */
const VIEWS = {
  sheet: { snap: 'full', toast: false },
  toast: { snap: 'half', toast: true },
} as const satisfies Record<FigureState<'3.2'>, { readonly snap: SheetSnap; readonly toast: boolean }>;

const STATES = stateTuple(VIEWS);

/** 1,240 m away: FAR (the route and the distance card take its colour). */
const FAR = zoneFor(responderDistance.far);

/**
 * FIG 3.2 Incoming dispatch: the map with the road route in the FAR colour, and the NEW
 * EMERGENCY sheet (LIVE chip, Maps/Waze/Chat/Call, the 1,240 m distance card, the FIRE ticket)
 * with DECLINE and ACCEPT. Nothing here follows the brand.
 */
export function IncomingDispatchScreen({ state }: ReplicaProps): ReactNode {
  const view = VIEWS[pickState(STATES, state)];
  const { puck, heading, scene } = responderScenes.incident;
  return (
    <MapScreen
      map={
        <RMapCanvas
          theme="light"
          height="full"
          traffic
          pins={[incidentPin(scene)]}
          route={{ path: 'en-route', color: ZONES[FAR].color, width: 5 }}
          className="rx-responder-map"
        />
      }
      puck={<ResponderPuck x={puck.x} y={puck.y} heading={heading.flat} />}
      header={<MapHeader duty="online" />}
      overlay={
        <>
          <DispatchSheet
            snap={view.snap}
            stage="new"
            footer={<DispatchFooter stage="new" />}
            riseAt={view.toast ? DISPATCH_TIMELINE.riseAt : undefined}
          >
            <DistanceCard zone={FAR} distance={responderDistance.far} />
            {/* At the 50% snap the info card sits below the visible body: not drawn. */}
            {view.snap === 'full' ? <IncidentInfoCard /> : null}
          </DispatchSheet>
          {view.toast ? (
            <RToast text="New ticket assigned — opening the map." icon={CircleAlert} iconColor="#1e90ff" className="rx-responder-toast" />
          ) : null}
        </>
      }
    >
      <GlassStack>
        <EtaRibbon />
        <VehicleCard />
      </GlassStack>
      <MapFabStack bottom={FAB_BOTTOM[view.snap]}>
        {view.snap === 'half' ? <MapFab icon={Expand} /> : null}
        <MapFab icon={LocateFixed} />
      </MapFabStack>
    </MapScreen>
  );
}
