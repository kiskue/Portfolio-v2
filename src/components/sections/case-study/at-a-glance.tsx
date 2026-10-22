import type { ReactNode } from 'react';
import { CaseStudySection, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { BrandIcon, ListingLines } from '@/components/sections/case-study/store-facts';
import { Card } from '@/components/ui/card';
import { Chip, chipVariants } from '@/components/ui/chip';
import { Copy, MetaLine, renderField } from '@/components/ui/copy';
import { ExternalLink } from '@/components/ui/external-link';
import { SiteLink } from '@/components/ui/site-link';
import { StatusDot } from '@/components/ui/status-dot';
import { STORE_NAME } from '@/components/ui/store-link';
import { caseStudyBySlug, caseStudyGlanceStatus, citizenStoreFacts } from '@/content/derived';
import { projects } from '@/content/projects';
import { site } from '@/content/site';
import type { ProjectLink, Segments } from '@/content/types';
import { cn } from '@/lib/cn';
import { fieldOrNull, hasToken, segments } from '@/lib/placeholder';
import { caseStudyHref } from '@/lib/routes';

/*
 * Section 2, At a glance (design §6.2): a <dl> card, three columns when wide and one when narrow:
 * role, context, platforms, stack (six chips, then "+n" to show the rest), status, timeline and
 * links. Store links are text links beside the app icon (PLAN: no official badges); listing counts
 * in the status come from the store data (derived.ts).
 */

/** Stack chips shown before the "+n" disclosure (design §6.2). */
export const GLANCE_STACK_SHOWN = 6;

function GlanceItem({ term, children }: { readonly term: string; readonly children: ReactNode }): ReactNode {
  return (
    <div className="flex min-w-0 flex-col gap-1.5" data-glance={term}>
      <dt className="text-eyebrow text-ink-3 uppercase">{term}</dt>
      <dd className="text-body-sm text-ink-2">{children}</dd>
    </div>
  );
}

/** Long segments (the role) as lines rather than one " · " line; hidden segments leave no gap. */
function SegmentLines({ value }: { readonly value: Segments }): ReactNode {
  return segments(value, site.placeholders).map((segment, index) => (
    <span key={index} className={cn('block', index === 0 ? 'font-semibold text-ink' : 'mt-1')}>
      {renderField(segment)}
    </span>
  ));
}

function StackList({ stack }: { readonly stack: readonly string[] }): ReactNode {
  const shown = stack.slice(0, GLANCE_STACK_SHOWN);
  const rest = stack.slice(GLANCE_STACK_SHOWN);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <ul aria-label="Tech stack" className="flex flex-wrap gap-1.5">
        {shown.map((item) => (
          <li key={item}>
            <Chip size="sm">{item}</Chip>
          </li>
        ))}
      </ul>
      {rest.length > 0 ? (
        <details className="group">
          <summary
            className={cn(
              chipVariants({ size: 'sm' }),
              'w-fit cursor-pointer list-none transition-colors duration-(--dur-1) hover:bg-sunken [&::-webkit-details-marker]:hidden',
            )}
          >
            <span className="group-open:hidden">
              +{rest.length}
              <span className="sr-only"> more: show the whole stack</span>
            </span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <ul aria-label="More of the stack" className="mt-1.5 flex flex-wrap gap-1.5">
            {rest.map((item) => (
              <li key={item}>
                <Chip size="sm">{item}</Chip>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/** One non-store link: external, internal, or (an unconfirmed URL) a non-link placeholder chip. */
function OtherLink({ link }: { readonly link: Exclude<ProjectLink, { readonly kind: 'store' }> }): ReactNode {
  switch (link.kind) {
    case 'case-study':
      return <SiteLink href={caseStudyHref(link.slug)}>{caseStudyBySlug(link.slug).title}</SiteLink>;
    case 'store-page':
      return <ExternalLink href={link.href}>{STORE_NAME[link.platform]}</ExternalLink>;
    case 'repo':
    case 'site': {
      const href = fieldOrNull(link.href, site.placeholders);
      if (href === null) return null;
      if (hasToken(href)) {
        return (
          <Chip tone="ph" size="sm" className="border-dashed border-ph-ink">
            <Copy text={link.label} />
            <span className="sr-only"> (link not added yet)</span>
          </Chip>
        );
      }
      return (
        <ExternalLink href={href}>
          <Copy text={link.label} />
        </ExternalLink>
      );
    }
  }
}

/** Store links grouped by brand (icon, name, text links), then any other links. */
function GlanceLinks({ links }: { readonly links: readonly ProjectLink[] }): ReactNode {
  const storeIds = new Set(links.flatMap((link) => (link.kind === 'store' ? [link.listing] : [])));
  const storeRows = citizenStoreFacts
    .map((facts) => ({ ...facts, listings: facts.listings.filter((entry) => storeIds.has(entry.listing.id)) }))
    .filter((facts) => facts.listings.length > 0);
  const others = links.flatMap((link) => (link.kind === 'store' ? [] : [link]));
  return (
    <ul className="flex flex-col gap-3">
      {storeRows.map((facts) => (
        <li key={facts.brand.id} className="flex items-start gap-2.5">
          <BrandIcon facts={facts} size={32} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold text-ink">{facts.brand.name}</span>
            <ListingLines facts={facts} />
          </div>
        </li>
      ))}
      {others.map((link, index) => (
        <li key={index}>
          <OtherLink link={link} />
        </li>
      ))}
    </ul>
  );
}

/** Whether a link renders anything in the current placeholder mode. */
function linkShows(link: ProjectLink): boolean {
  if (link.kind === 'repo' || link.kind === 'site') return fieldOrNull(link.href, site.placeholders) !== null;
  return true;
}

export function AtAGlance({ study }: SectionProps): ReactNode {
  const { glance } = study;
  const project = projects.find((candidate) => candidate.slug === study.projectSlug);
  const status = caseStudyGlanceStatus(study);
  const timeline = fieldOrNull(glance.timeline, site.placeholders);
  const links = glance.links.filter(linkShows);
  const has = (value: Segments) => segments(value, site.placeholders).length > 0;

  return (
    <CaseStudySection id="overview">
      <Card surface="surface" radius="card" pad="md" className="@container/glance">
        <dl className="grid gap-x-8 gap-y-6 @2xl/glance:grid-cols-2 @4xl/glance:grid-cols-3">
          {has(glance.role) ? (
            <GlanceItem term="Role">
              <SegmentLines value={glance.role} />
            </GlanceItem>
          ) : null}
          {has(glance.context) ? (
            <GlanceItem term="Context">
              <MetaLine as="span" segments={glance.context} />
            </GlanceItem>
          ) : null}
          {has(glance.platforms) ? (
            <GlanceItem term="Platforms">
              <MetaLine as="span" segments={glance.platforms} />
            </GlanceItem>
          ) : null}
          {glance.stack.length > 0 ? (
            <GlanceItem term="Stack">
              <StackList stack={glance.stack} />
            </GlanceItem>
          ) : null}
          {has(status) ? (
            <GlanceItem term="Status">
              <span className="inline-flex items-baseline gap-2">
                {project ? <StatusDot status={project.status} className="self-center" /> : null}
                <MetaLine as="span" segments={status} />
              </span>
            </GlanceItem>
          ) : null}
          {timeline ? (
            <GlanceItem term="Timeline">
              <Copy text={timeline} />
            </GlanceItem>
          ) : null}
          {links.length > 0 ? (
            <GlanceItem term="Links">
              <GlanceLinks links={links} />
            </GlanceItem>
          ) : null}
        </dl>
      </Card>
    </CaseStudySection>
  );
}
