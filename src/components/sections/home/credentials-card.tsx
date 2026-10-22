import type { ReactNode } from 'react';
import { BentoCard } from '@/components/ui/bento-card';
import { Chip, ExampleTag } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { credentials } from '@/content/credentials';
import { home } from '@/content/home';
import { profile } from '@/content/profile';
import { site } from '@/content/site';
import type { Credential, PlaceholderMode } from '@/content/types';
import { visible } from '@/lib/placeholder';
import { aboutHref } from '@/lib/routes';
import { cardLink } from '@/components/sections/home/card-link';

/** The credential the card features: the first visible one, unless that is the degree itself. */
export function featuredCredential(list: readonly Credential[], mode: PlaceholderMode): Credential | null {
  const [first] = visible(list, mode);
  return first && first.kind !== 'degree' ? first : null;
}

/** A 112px raised medal with a ring, the graduation cap in ink (design §4.3). Decorative. */
function Medallion(): ReactNode {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-28 shrink-0 items-center justify-center rounded-full border border-line bg-raised text-ink shadow-[0_0_0_6px_var(--c-sunken),0_0_0_7px_var(--c-line),var(--sh-md)]"
    >
      <Icon name="graduation-cap" size={36} strokeWidth={1.5} />
    </span>
  );
}

export interface CredentialsCardProps {
  readonly mode?: PlaceholderMode;
}

/**
 * Credentials (design §4.3): a medallion and a navy pill, as a whole-card link to
 * /about#credentials. The pill names the first visible credential: in label mode the example
 * certification (with its Example tag), the degree on the line below; in hide mode, which drops
 * examples, the degree itself ("BS Computer Science · TCU").
 */
export function CredentialsCard({ mode = site.placeholders }: CredentialsCardProps): ReactNode {
  const copy = home.cards.cred;
  const { education } = profile;
  const degree = `${education.degree} · ${education.short}`;
  const featured = featuredCredential(credentials, mode);
  return (
    <BentoCard
      area="cred"
      icon="award"
      title={copy.title}
      description={copy.description}
      link={cardLink('cred', aboutHref('credentials'), 'stretched')}
    >
      {/* Pointer events pass through to the stretched link that covers the card. */}
      <div className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-4 pt-2 text-center">
        <Medallion />
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Chip tone="ink" size="md">
              <span aria-hidden="true" className="me-1 inline-block size-1.5 shrink-0 rounded-full bg-status-beta" />
              {featured ? <Copy text={featured.title} mode={mode} /> : degree}
            </Chip>
            {featured?.example && mode === 'label' ? <ExampleTag /> : null}
          </div>
          {featured ? <p className="text-meta text-ink-3">{degree}</p> : null}
        </div>
      </div>
    </BentoCard>
  );
}
