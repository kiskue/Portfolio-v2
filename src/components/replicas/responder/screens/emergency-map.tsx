import { LocateFixed } from 'lucide-react';
import type { ReactNode } from 'react';
import { pickState, RMapCanvas, type ReplicaProps } from '@/components/replicas/kit';
import { ActionPill } from '@/components/replicas/responder/parts/action-pill';
import { GlassStack, LimitedSharingChip, MapFab, MapFabStack, VehicleCard } from '@/components/replicas/responder/parts/map-chrome';
import { MapHeader } from '@/components/replicas/responder/parts/map-header';
import { MapScreen } from '@/components/replicas/responder/parts/map-screen';
import type { DutyStatus } from '@/components/replicas/responder/parts/palette';
import { PublicAlertStrip } from '@/components/replicas/responder/parts/public-alert-strip';
import { ResponderPuck } from '@/components/replicas/responder/parts/responder-puck';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import { peerPins, responderScenes } from '@/components/replicas/responder/sample-data';
import type { FigureState } from '@/content/apps/figures';

/** 'online' plays the duty-switch glimpse while active (Offline → Connecting… → Online); the others are still. */
const VIEWS = {
  online: { duty: 'online', animated: true },
  offline: { duty: 'offline', animated: false },
  connecting: { duty: 'connecting', animated: false },
} as const satisfies Record<FigureState<'3.1'>, { readonly duty: DutyStatus; readonly animated: boolean }>;

const STATES = stateTuple(VIEWS);

/**
 * FIG 3.1 Emergency map, on duty: the header with the duty chip, the public-alert strip, the
 * glass stack (Limited sharing, Rescue Van 2), the heading puck among three fellow responders,
 * the locate FAB and the Report / Offline Respond / Call pill.
 */
export function EmergencyMapScreen({ state }: ReplicaProps): ReactNode {
  const view = VIEWS[pickState(STATES, state)];
  const { puck } = responderScenes.shift;
  return (
    <MapScreen
      map={<RMapCanvas theme="light" height="full" traffic pins={peerPins} className="rx-responder-map" />}
      puck={<ResponderPuck x={puck.x} y={puck.y} heading={puck.heading} accuracy={34} />}
      header={<MapHeader duty={view.duty} animated={view.animated} />}
      strip={<PublicAlertStrip />}
    >
      <GlassStack>
        <LimitedSharingChip />
        <VehicleCard />
      </GlassStack>
      <MapFabStack bottom={128}>
        <MapFab icon={LocateFixed} />
      </MapFabStack>
      <ActionPill />
    </MapScreen>
  );
}
