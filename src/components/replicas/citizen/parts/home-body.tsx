import type { ReactNode } from 'react';
import { HomeFeed } from './home-feed';
import { StationCard } from './station-card';

/**
 * The Home tab's scroll content from the top: the weather-station panel, then the start of the
 * feed (enough to fill the screen after the 2.1 scroll to the Safety Brief).
 */
export function HomeBody(): ReactNode {
  return (
    <div className="rx-citizen-home">
      <StationCard />
      <HomeFeed extent="top" />
    </div>
  );
}
