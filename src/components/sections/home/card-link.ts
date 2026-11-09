import type { BentoCardLink } from '@/components/ui/bento-card';
import { home } from '@/content/home';
import type { BentoArea, SiteRoute } from '@/content/types';

/**
 * A bento card's link, labelled from its Home copy (src/content/home.ts). Where the card links
 * follows design §2 "Where the Home bento cards link": 'stretched' (the whole card) only for a
 * card with no other interactive content, else an explicit 'header' link and no hover lift.
 */
export function cardLink(area: BentoArea, href: SiteRoute, mode: BentoCardLink['mode']): BentoCardLink {
  const label = home.cards[area].linkLabel;
  if (!label) throw new Error(`home.cards.${area} has no linkLabel`);
  return { href, label, mode };
}
