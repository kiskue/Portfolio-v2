import type { ReactNode } from 'react';
import { pickState, RAutoScroll, type ReplicaProps } from '@/components/replicas/kit';
import { HomeBody } from '@/components/replicas/citizen/parts/home-body';
import { TabScreen } from '@/components/replicas/citizen/parts/tab-screen';
import { czTitles } from '@/components/replicas/citizen/sample-data';
import { figureStates } from './figure-states';

const STATES = figureStates('2.1');

/** Glimpse row 2.1: from the station hero to the Safety Brief, −260 px over 1.6 s from +0.8 s. */
const SCROLL = { distance: 260, startMs: 800, durationMs: 1600 } as const;

/**
 * FIG 2.1 Home dashboard (citizen.json home-dashboard). `top`: the weather-station card under
 * the header; while active the body scrolls 260 px down to the Defensight Safety Brief.
 * `brief`: the same screen resting at that scroll offset.
 */
export function HomeDashboardScreen({ state }: ReplicaProps): ReactNode {
  const current = pickState(STATES, state);
  return (
    <TabScreen title={czTitles.home} titleSize={10} tab="Home">
      <RAutoScroll {...SCROLL} poster={current === 'brief' ? 'end' : 'start'} className="rx-citizen-fill">
        <HomeBody />
      </RAutoScroll>
    </TabScreen>
  );
}
