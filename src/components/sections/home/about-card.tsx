import Image from 'next/image';
import type { ReactNode } from 'react';
import portrait from '@/assets/portrait/gerric-portrait.jpg';
import { BentoCard } from '@/components/ui/bento-card';
import { Icon } from '@/components/ui/icon';
import { Years } from '@/components/ui/placeholder-facts';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import { site } from '@/content/site';
import type { PlaceholderMode } from '@/content/types';
import { aboutHref } from '@/lib/routes';
import { cardLink } from '@/components/sections/home/card-link';

/**
 * Three polaroids fanned from the bottom centre (design §4.3): the location card at the back,
 * the degree card in the middle and the portrait in front. Decorative (design §10: the About
 * polaroids are alt=""), so the whole fan is hidden from assistive technology; the card's title
 * and description carry the meaning. The portrait requests the same 104px image as the avatar,
 * so the page downloads it once.
 */
function FanStack(): ReactNode {
  const { education } = profile;
  return (
    <div className="fan" aria-hidden="true">
      <div className="fan-card fan-card--back">
        <div className="fan-fact">
          <Icon name="map-pin" size={16} />
          <span>{profile.location}</span>
          <span>{profile.timezone}</span>
        </div>
      </div>
      <div className="fan-card fan-card--middle">
        <div className="fan-fact">
          <Icon name="graduation-cap" size={16} />
          <span>{education.degree}</span>
          <span>{education.school}</span>
        </div>
      </div>
      <div className="fan-card fan-card--front">
        <Image src={portrait} alt="" width={104} height={104} loading="lazy" className="fan-photo" />
      </div>
    </div>
  );
}

export interface AboutCardProps {
  readonly mode?: PlaceholderMode;
}

/**
 * About (design §4.3): the fan of three polaroids, which spreads on hover or focus, as a
 * whole-card link to /about (it holds nothing else interactive). Years of experience follow the
 * placeholder rule (S5.10): "[[N]]+ years" in label mode until set, nothing in hide mode, and
 * never in a headline.
 */
export function AboutCard({ mode = site.placeholders }: AboutCardProps): ReactNode {
  const copy = home.cards.about;
  return (
    <BentoCard
      area="about"
      icon="user-round"
      title={copy.title}
      description={copy.description}
      link={cardLink('about', aboutHref(), 'stretched')}
    >
      {/* Pointer events pass through to the stretched link that covers the card. */}
      <div className="pointer-events-none flex flex-1 flex-col items-center justify-end gap-2">
        <FanStack />
        <Years
          years={profile.yearsOfExperience}
          suffix="+ years shipping production apps"
          as="p"
          mode={mode}
          className="text-center text-meta text-ink-3"
        />
      </div>
    </BentoCard>
  );
}
