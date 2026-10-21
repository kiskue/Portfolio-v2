import type { ReactNode } from 'react';
import { ms, pickState, rStyle, type ReplicaProps } from '@/components/replicas/kit';
import { HazardListView } from '@/components/replicas/citizen/parts/hazard-list-view';
import { HazardMapView } from '@/components/replicas/citizen/parts/hazard-map-view';
import { CZ_HAZARD_TIMELINE } from '@/components/replicas/citizen/parts/timeline';
import { figureStates } from './figure-states';

const STATES = figureStates('2.5');

/**
 * FIG 2.5 Hazard map (citizen.json hazard-map).
 * `map`: the Hazard Location modal with the Flood and "Your Location" pins and "1.2 km from you".
 * `list`: the Hazards tab; while active the Flood card is tapped, the map modal slides up over
 * the list and its card rises (CZ_HAZARD_TIMELINE, glimpse 2.5).
 */
export function HazardMapScreen({ state }: ReplicaProps): ReactNode {
  const current = pickState(STATES, state);
  if (current === 'map') return <HazardMapView />;
  return (
    <div
      className="rx-citizen-hflow"
      style={rStyle({
        '--rx-citizen-tap-at': ms(CZ_HAZARD_TIMELINE.tapMs),
        '--rx-citizen-sheet-at': ms(CZ_HAZARD_TIMELINE.sheetMs),
        '--rx-citizen-map-at': ms(CZ_HAZARD_TIMELINE.cardMs),
      })}
    >
      <HazardListView />
      <div className="rx-citizen-hflow__modal">
        <HazardMapView />
      </div>
    </div>
  );
}
