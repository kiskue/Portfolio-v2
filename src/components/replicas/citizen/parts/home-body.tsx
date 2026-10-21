import type { ReactNode } from 'react';
import { HomeFeed, type HomeFeedExtent } from './home-feed';
import { StationCard } from './station-card';

/**
 * The Home tab's scroll content from the top: the weather-station panel, then as much of the
 * feed as the screen can ever show (2.1 scrolls 260 px into it; 2.3 shows only its first band,
 * and none of it once the offline strip pushes that band under the bottom inset).
 */
export function HomeBody({ feed }: { readonly feed: Exclude<HomeFeedExtent, 'full'> | 'none' }): ReactNode {
  return (
    <div className="rx-citizen-home">
      <StationCard />
      {feed === 'none' ? null : <HomeFeed extent={feed} />}
    </div>
  );
}
