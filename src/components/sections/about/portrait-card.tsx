import Image from 'next/image';
import portrait from '@/assets/portrait/gerric-portrait.jpg';
import { AvailabilityPill } from '@/components/layout/availability-pill';
import { SocialRow } from '@/components/layout/social-row';
import { Card } from '@/components/ui/card';
import { Copy, MetaLine } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { CvLink } from '@/components/ui/placeholder-facts';
import { profile } from '@/content/profile';
import { site } from '@/content/site';
import type { PlaceholderMode } from '@/content/types';

export interface PortraitCardProps {
  readonly mode?: PlaceholderMode;
}

/**
 * The About portrait card (design §8): the B&W portrait in a 4:5 crop with a peach glow, then
 * name, title, location and time zone, the availability pill, the CV control and the socials.
 *
 * Layout follows <main>'s width: phones stack a 240px portrait over the details; from 36rem the
 * details sit beside it; from 56rem the card is the page's left column (20rem, the portrait
 * full-bleed at 320px) and sticks while the right column scrolls, on screens tall enough to show
 * all of it.
 *
 * The portrait is the page's largest image and sits above the fold at every width, so it is
 * preloaded. The CV is a non-link placeholder chip in label mode and nothing in hide mode (CvLink).
 */
export function PortraitCard({ mode = site.placeholders }: PortraitCardProps) {
  return (
    <div
      className="relative [--sticky-top:5rem] xl:[--sticky-top:1.5rem] @4xl:[@media(min-height:50rem)]:sticky @4xl:[@media(min-height:50rem)]:top-(--sticky-top)"
      data-portrait-card=""
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-4 -top-4 bottom-1/3 -z-10 bg-[radial-gradient(closest-side,rgb(var(--peach)/var(--peach-alpha))_20%,transparent)]"
      />
      <Card pad="none" className="overflow-hidden">
        <div className="flex flex-col gap-5 p-4 md:p-5 @xl:flex-row @xl:items-center @4xl:flex-col @4xl:items-stretch @4xl:gap-0 @4xl:p-0">
          <div className="relative aspect-[4/5] w-60 shrink-0 overflow-hidden rounded-control bg-sunken @4xl:w-full @4xl:rounded-none">
            <Image
              src={portrait}
              alt={profile.portraitAlt}
              fill
              sizes="(min-width: 60rem) 320px, 240px"
              preload
              placeholder="blur"
              className="object-cover object-[52%_30%] grayscale"
            />
          </div>
          <div className="flex min-w-0 flex-col items-start gap-4 @4xl:p-5">
            <div>
              <p className="text-h3-hero text-ink">{profile.name}</p>
              <Copy as="p" text={profile.title} mode={mode} className="mt-0.5 text-body-sm text-ink-2" />
            </div>
            <p className="flex items-center gap-1.5 text-meta text-ink-2">
              <Icon name="map-pin" size={16} className="text-ink-3" />
              <MetaLine as="span" segments={[profile.location, profile.timezone]} mode={mode} />
            </p>
            <AvailabilityPill mode={mode} />
            <CvLink href={profile.cvUrl} size="sm" mode={mode} />
            <SocialRow themeToggle={false} />
          </div>
        </div>
      </Card>
    </div>
  );
}
