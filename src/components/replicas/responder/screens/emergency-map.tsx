import { LocateFixed } from 'lucide-react';
import type { ReactNode } from 'react';
import { pickState, RMapCanvas, type ReplicaProps } from '@/components/replicas/kit';
import { ActionPill } from '@/components/replicas/responder/parts/action-pill';
import { GlassStack, LimitedSharingChip, MapFab, MapFabStack, VehicleCard } from '@/components/replicas/responder/parts/map-chrome';
import { MapHeader } from '@/components/replicas/responder/parts/map-header';
import { MapScreen } from '@/components/replicas/responder/parts/map-screen';
import type { DutyStatus } from '@/components/replicas/responder/parts/palette';
import { PublicAlertStrip } from '@/components/replicas/responder/parts/public-alert-strip';
import { stateTuple } from '@/components/replicas/responder/parts/states';
import type { FigureState } from '@/content/apps/figures';

/**
 * 'offline' is the glimpse step (offline → online): while active the duty switch is tapped and
 * the chip goes Connecting… then You're Online; its static picture stays You're Offline. 'online'
 * (the glimpse poster) and 'connecting' are still.
 */
const VIEWS = {
  online: { duty: 'online', goesOnline: false },
  offline: { duty: 'offline', goesOnline: true },
  connecting: { duty: 'connecting', goesOnline: false },
} as const satisfies Record<FigureState<'3.1'>, { readonly duty: DutyStatus; readonly goesOnline: boolean }>;

const STATES = stateTuple(VIEWS);

/**
 * FIG 3.1 Emergency map, on duty: the header with the duty chip, the public-alert strip, the
 * glass stack (Limited sharing, Rescue Van 2), the map's 'duty' scene (the van puck at heading
 * 40° among three fellow responders, with traffic), the locate FAB and the Report / Offline
 * Respond / Call pill.
 */
export function EmergencyMapScreen({ state }: ReplicaProps): ReactNode {
  const view = VIEWS[pickState(STATES, state)];
  return (
    <MapScreen
      map={<RMapCanvas theme="light" height="full" scene="duty" className="rx-responder-map" />}
      header={<MapHeader duty={view.duty} goesOnline={view.goesOnline} />}
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
