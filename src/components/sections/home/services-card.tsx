import type { ReactNode } from 'react';
import { BentoCard } from '@/components/ui/bento-card';
import { NumberedList } from '@/components/ui/numbered-list';
import { home } from '@/content/home';
import { services } from '@/content/services';
import { site } from '@/content/site';
import type { PlaceholderMode } from '@/content/types';
import { visible } from '@/lib/placeholder';
import { servicesHref } from '@/lib/routes';
import { cardLink } from '@/components/sections/home/card-link';

export interface ServicesCardProps {
  readonly mode?: PlaceholderMode;
}

/**
 * Services (design §4.3): the five services as numbered rows (01–05 from their order), each
 * linking to its block on /services. The rows are links, so the card has a header link to
 * /services and no hover lift.
 */
export function ServicesCard({ mode = site.placeholders }: ServicesCardProps): ReactNode {
  const copy = home.cards.serv;
  const items = visible(services, mode).map((service) => ({
    id: service.id,
    label: service.short,
    href: servicesHref(service.id),
    icon: service.icon,
  }));
  return (
    <BentoCard
      area="serv"
      icon="layers"
      title={copy.title}
      description={copy.description}
      link={cardLink('serv', servicesHref(), 'header')}
    >
      <NumberedList items={items} look="rows" />
    </BentoCard>
  );
}
