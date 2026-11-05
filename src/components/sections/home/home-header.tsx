import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Copy, MetaLine } from '@/components/ui/copy';
import { CvLink } from '@/components/ui/placeholder-facts';
import { home } from '@/content/home';
import { availabilityLine, profile } from '@/content/profile';
import { site } from '@/content/site';
import type { PlaceholderMode } from '@/content/types';
import { fieldOrNull } from '@/lib/placeholder';
import { contactHref, projectsHref } from '@/lib/routes';

export interface HomeHeaderProps {
  readonly mode?: PlaceholderMode;
}

/**
 * The Home header row (design §1, §4.2). The H1 sets the headline as two lines from 768px (one
 * break, so the whole heading stays one text block: the LCP element) and wraps naturally below
 * it; the subline sits under it. "Get in touch ↗" sits top-right from 768px; below that it moves
 * under the subline beside "View projects". The CV control follows the placeholder rule (a
 * download when cvUrl is set, a non-link placeholder chip in label mode, nothing in hide mode),
 * and the meta row shows only below 1280px, where the sidebar with the same facts is hidden. Over
 * the painting the meta row sits low in a short hero, where the scrim has faded, so it is ink-2
 * (not the usual meta ink-3) on a denser plate (`.hero-meta` in hero.css; ledger Ruling 46).
 */
export function HomeHeader({ mode = site.placeholders }: HomeHeaderProps): ReactNode {
  const [first, second] = home.headline;
  const available = fieldOrNull(profile.availability.label, mode) !== null;
  return (
    <header className="grid gap-x-8 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <h1 className="text-display text-balance text-ink">
          {first}
          <br className="max-md:hidden" /> {second}
        </h1>
        <Copy as="p" text={home.subline} mode={mode} className="mt-4 max-w-[60rem] text-lead text-ink-2" />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-1 md:flex-col md:items-end md:self-start">
        <ButtonLink href={contactHref()} icon="arrow-up-right">
          {home.ctas.contact}
        </ButtonLink>
        <ButtonLink href={projectsHref()} variant="secondary" className="md:hidden">
          {home.ctas.projects}
        </ButtonLink>
        <CvLink href={profile.cvUrl} label={home.ctas.cv} mode={mode} />
      </div>
      <p className="hero-meta mt-4 flex flex-wrap items-center gap-x-2 text-meta text-ink-2 md:col-span-2 xl:hidden">
        {available ? <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-status-live" /> : null}
        <MetaLine as="span" segments={availabilityLine} mode={mode} />
      </p>
    </header>
  );
}
