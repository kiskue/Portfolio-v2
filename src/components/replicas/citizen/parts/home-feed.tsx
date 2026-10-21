import { Activity, CalendarDays, Globe, Newspaper } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  czHazards,
  czModules,
  czMoreHazards,
  czOnlineServices,
  czQuakes,
} from '@/components/replicas/citizen/sample-data';
import { AnnouncementCard } from './announcement-card';
import { HazardCard } from './hazard-card';
import { ModuleHeader } from './module-header';
import { NewsCard } from './news-card';
import { QuakeCard } from './quake-card';

/**
 * How much of the stream a screen draws: only what can ever show in it (the DOM budget).
 * services: the Online Services band that peeks under the dashboard on 2.3.
 * dashboard: also the announcement and the Today's Report band, reached by the 2.1 scroll.
 * full: the whole stream, Today's Report rows to the News Headline (2.2).
 */
export type HomeFeedExtent = 'services' | 'dashboard' | 'full';

export interface HomeFeedProps {
  readonly extent: HomeFeedExtent;
}

/**
 * The Home stream under the weather panel (home index.tsx order): Online Services, the
 * announcement carousel, Today's Report (two hazards, then "See More"), the Earthquake Monitor
 * (limit 3) and the News Headline. Section bands and links follow the brand; every reading,
 * severity and intensity colour stays fixed.
 */
export function HomeFeed({ extent }: HomeFeedProps): ReactNode {
  const { today, quakes, news } = czModules;
  return (
    <div className="rx-citizen-feed">
      <span className="rx-citizen-feed__services">
        <ModuleHeader icon={Globe} tone="glass" {...czOnlineServices} />
      </span>
      {extent === 'services' ? null : (
        <>
          <span className="rx-citizen-feed__carousel">
            <AnnouncementCard />
          </span>
          <ModuleHeader icon={CalendarDays} {...today} />
        </>
      )}
      {extent === 'full' ? (
        <>
          <span className="rx-citizen-feed__list">
            {czHazards.slice(0, 2).map((hazard) => (
              <HazardCard key={hazard.type} hazard={hazard} />
            ))}
            <span className="rx-citizen-feed__more">{czMoreHazards}</span>
          </span>
          <ModuleHeader icon={Activity} {...quakes} />
          <span className="rx-citizen-feed__quakes">
            {czQuakes.map((quake) => (
              <QuakeCard key={quake.place} quake={quake} />
            ))}
          </span>
          <ModuleHeader icon={Newspaper} {...news} />
          <NewsCard />
        </>
      ) : null}
    </div>
  );
}
