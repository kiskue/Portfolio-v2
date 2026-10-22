import { CircleAlert, Expand, Locate } from 'lucide-react';
import type { ReactNode } from 'react';
import { pickState, RMapCanvas, RToast, type ReplicaProps } from '@/components/replicas/kit';
import { DistanceCard } from '@/components/replicas/responder/parts/distance-card';
import { DispatchFooter } from '@/components/replicas/responder/parts/dispatch-footer';
import { DispatchSheet, FAB_BOTTOM, type SheetSnap } from '@/components/replicas/responder/parts/dispatch-sheet';
import { IncidentInfoCard } from '@/components/replicas/responder/parts/incident-info-card';
import { EtaRibbon, GlassStack, MapFab, MapFabStack, VehicleCard } from '@/components/replicas/responder/parts/map-chrome';
import { MapHeader } from '@/components/replicas/responder/parts/map-header';
import { screenWidth, titledIncident } from '@/components/replicas/responder/parts/map-scene';
import { MapScreen } from '@/components/replicas/responder/parts/map-screen';
import { ZONES, zoneFor } from '@/components/replicas/responder/parts/palette';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import { DISPATCH_TIMELINE } from '@/components/replicas/responder/parts/timeline';
import { responderDistance } from '@/components/replicas/responder/sample-data';
import type { FigureState } from '@/content/apps/figures';

/**
 * 'sheet': the responder has dragged the sheet to its 85% snap to read the ticket.
 * 'toast': the moment of assignment and the glimpse step (toast → sheet): while active the toast
 * drops in, the sheet rises to 50% (NEW EMERGENCY, the FIRE pin titled on the map) and ACCEPT
 * is pressed at the glimpse tap. Its static picture is the toast over the risen sheet.
 */
const VIEWS = {
  sheet: { snap: 'full', toast: false },
  toast: { snap: 'half', toast: true },
} as const satisfies Record<FigureState<'3.2'>, { readonly snap: SheetSnap; readonly toast: boolean }>;

const STATES = stateTuple(VIEWS);

/** 1,240 m away: FAR (the route and the distance card take its colour). */
const FAR = zoneFor(responderDistance.far);

/**
 * The 'dispatch' scene frames the responder and the new incident above the half sheet (the
 * camera's fit-both overview), so the zoom-out-map FAB reads active. The app draws the road
 * route as soon as a ticket is assigned, 5px on screen in the zone colour.
 */
const MAP = (
  <RMapCanvas
    theme="light"
    height="full"
    scene="dispatch"
    pins={titledIncident('dispatch')}
    route={{ path: 'en-route', color: ZONES[FAR].color, width: screenWidth(5, 'dispatch') }}
    className="rx-responder-map"
  />
);

/**
 * FIG 3.2 Incoming dispatch: the map with the road route in the FAR colour, and the NEW
 * EMERGENCY sheet (LIVE chip, Maps/Waze/Chat/Call, the 1,240 m distance card, the FIRE ticket)
 * with DECLINE and ACCEPT. Nothing here follows the brand.
 */
export function IncomingDispatchScreen({ state }: ReplicaProps): ReactNode {
  const view = VIEWS[pickState(STATES, state)];
  return (
    <MapScreen
      map={MAP}
      header={<MapHeader duty="online" />}
      overlay={
        <>
          <DispatchSheet
            snap={view.snap}
            stage="new"
            footer={<DispatchFooter stage="new" pressAt={view.toast ? DISPATCH_TIMELINE.acceptPressAt : undefined} />}
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
        {/* At the 85% snap a second FAB would run under the header: only the locate FAB shows. */}
        {view.snap === 'half' ? <MapFab icon={Expand} active /> : null}
        <MapFab icon={Locate} />
      </MapFabStack>
    </MapScreen>
  );
}
