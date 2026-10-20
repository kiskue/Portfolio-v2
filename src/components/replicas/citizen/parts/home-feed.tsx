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

export interface HomeFeedProps {
  /**
   * top: Online Services, the announcement and Today's Report (all that shows under the
   * dashboard on 2.1). full: also the Earthquake Monitor and News Headline (2.2).
   */
  readonly extent: 'top' | 'full';
}

/**
 * The Home stream under the weather panel (home index.tsx order): Online Services, the
 * announcement carousel, Today's Report (two hazards, then "See More"), the Earthquake Monitor
 * and the News Headline. Section bands and links follow the brand; every reading, severity and
 * intensity colour stays fixed.
 */
export function HomeFeed({ extent }: HomeFeedProps): ReactNode {
  const { today, quakes, news } = czModules;
  return (
    <div className="rx-citizen-feed">
      <span className="rx-citizen-feed__services">
        <ModuleHeader icon={Globe} tone="glass" {...czOnlineServices} />
      </span>
      <span className="rx-citizen-feed__carousel">
        <AnnouncementCard />
      </span>
      <ModuleHeader icon={CalendarDays} {...today} />
      <span className="rx-citizen-feed__list">
        {czHazards.slice(0, 2).map((hazard) => (
          <HazardCard key={hazard.type} hazard={hazard} />
        ))}
        <span className="rx-citizen-feed__more">{czMoreHazards}</span>
      </span>
      {extent === 'full' ? (
        <>
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
