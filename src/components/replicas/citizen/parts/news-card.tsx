import { ArrowRight, Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { czNews } from '@/components/replicas/citizen/sample-data';

/**
 * A News Headline card (RenderNewsCard.tsx): a 36vw cover (an abstract colour field, never a
 * real photo) with the red NEW pill and the dark date chip, the two-line headline, and "Read
 * full story" in the brand secondary beside the muted time.
 */
export function NewsCard(): ReactNode {
  return (
    <span className="rx-citizen-news">
      <span className="rx-citizen-news__cover">
        <span className="rx-citizen-news__new">
          <span className="rx-citizen-news__dot" />
          NEW
        </span>
        <span className="rx-citizen-news__stamp">
          <RGlyph icon={Clock} size={14} />
          <span>{czNews.stamp}</span>
        </span>
      </span>
      <span className="rx-citizen-news__content">
        <span className="rx-citizen-news__headline">{czNews.headline}</span>
        <span className="rx-citizen-news__foot">
          <span className="rx-citizen-news__link">
            <span>{czNews.link}</span>
            <RGlyph icon={ArrowRight} size={16} />
          </span>
          <span className="rx-citizen-news__ago">
            <RGlyph icon={Clock} size={14} />
            <span>{czNews.ago}</span>
          </span>
        </span>
      </span>
    </span>
  );
}
