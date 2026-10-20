import type { ReactNode } from 'react';
import { czAnnouncement } from '@/components/replicas/citizen/sample-data';

/**
 * The announcement carousel's card (AnnouncementCard.tsx): 150 px, radius 14, a cover photo
 * under a dark blur with the text stack at the bottom left. The "photo" is an abstract colour
 * field (no real image); the eyebrow takes the brand's light text colour.
 */
export function AnnouncementCard(): ReactNode {
  return (
    <span className="rx-citizen-annc">
      <span className="rx-citizen-annc__photo" />
      <span className="rx-citizen-annc__text">
        <span className="rx-citizen-annc__eyebrow">{czAnnouncement.eyebrow}</span>
        <span className="rx-citizen-annc__date">{czAnnouncement.date}</span>
        <span className="rx-citizen-annc__title">{czAnnouncement.title}</span>
        <span className="rx-citizen-annc__excerpt">{czAnnouncement.excerpt}</span>
      </span>
    </span>
  );
}
