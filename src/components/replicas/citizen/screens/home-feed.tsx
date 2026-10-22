import type { ReactNode } from 'react';
import { pickState, RAutoScroll, type ReplicaProps } from '@/components/replicas/kit';
import { HomeFeed } from '@/components/replicas/citizen/parts/home-feed';
import { TabScreen } from '@/components/replicas/citizen/parts/tab-screen';
import { czTitles } from '@/components/replicas/citizen/sample-data';
import { figureStates } from './figure-states';

const STATES = figureStates('2.2');

/**
 * While active the feed scrolls to its end: past the Earthquake Monitor to the News Headline
 * card, which then rests 12 px clear of the tab bar (the feed is 1389 px tall in a 710 px view).
 */
const SCROLL = { distance: 679, startMs: 900, durationMs: 2600 } as const;

/**
 * FIG 2.2 Home feed (citizen.json home-feed): the Home tab scrolled past the weather panel, so
 * Online Services sits under the header, then the announcement, Today's Report, the Earthquake
 * Monitor and the News Headline (revealed by the scroll while active).
 */
export function HomeFeedScreen({ state }: ReplicaProps): ReactNode {
  pickState(STATES, state);
  return (
    <TabScreen title={czTitles.home} titleSize={10} tab="Home">
      <RAutoScroll {...SCROLL} className="rx-citizen-fill">
        <HomeFeed extent="full" />
      </RAutoScroll>
    </TabScreen>
  );
}
