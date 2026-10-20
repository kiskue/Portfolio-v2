import type { ReactNode } from 'react';
import { pickState, type ReplicaProps } from '@/components/replicas/kit';
import { HazardListView } from '@/components/replicas/citizen/parts/hazard-list-view';
import { HazardMapView } from '@/components/replicas/citizen/parts/hazard-map-view';
import { figureStates } from './figure-states';

const STATES = figureStates('2.5');

/**
 * FIG 2.5 Hazard map (citizen.json hazard-map).
 * `map`: the Hazard Location modal with the Flood and "Your Location" pins and "1.2 km from you".
 * `list`: the Hazards tab; while active the Flood card is tapped at 1.2 s and the map modal
 * slides up over the list (glimpse row 2.5; timings in citizen.css).
 */
export function HazardMapScreen({ state }: ReplicaProps): ReactNode {
  const current = pickState(STATES, state);
  if (current === 'map') return <HazardMapView />;
  return (
    <div className="rx-citizen-hflow">
      <HazardListView />
      <div className="rx-citizen-hflow__modal">
        <HazardMapView />
      </div>
    </div>
  );
}
