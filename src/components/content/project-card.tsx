import type { Route } from 'next';
import type { ReactNode } from 'react';
import { listingById } from '@/content/apps/store';
import { site } from '@/content/site';
import type { CaseStudyPath, Field, PlaceholderMode, Project, Segments, StoreListing } from '@/content/types';
import { ButtonLink } from '@/components/ui/button';
import { Card, stretchedLinkClass } from '@/components/ui/card';
import { Chip, ExampleTag } from '@/components/ui/chip';
import { Copy, MetaLine } from '@/components/ui/copy';
import { ExternalLink } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';
import { SiteLink } from '@/components/ui/site-link';
import { StatusDot } from '@/components/ui/status-dot';
import { STORE_NAME, StoreLink } from '@/components/ui/store-link';
import { cn } from '@/lib/cn';
import { fieldOrNull, hasToken } from '@/lib/placeholder';
import { CONTEXT_LABEL } from '@/lib/project-filters';
import { caseStudyHref } from '@/lib/routes';

export type ProjectCardLook = 'case-study' | 'compact' | 'adjacent';

export interface ProjectCardProps {
  readonly project: Project;
  /**
   * case-study: the large /projects card (phone slot, status, stack, "Read the case study");
   * compact: a "More work" card (icon tile, context chip, links);
   * adjacent: the previous / next card at the end of a case study.
   */
  readonly look: ProjectCardLook;
  /** A static, inert phone for the case-study look (e.g. <ScreenView size="sm" …/>). No links inside. */
  readonly phone?: ReactNode;
  /** adjacent look: which neighbour this card points to. Default 'next'. */
  readonly direction?: 'previous' | 'next';
  readonly headingLevel?: 'h2' | 'h3';
  readonly as?: 'article' | 'li';
  readonly mode?: PlaceholderMode;
  readonly className?: string;
}

/** Shown stack chips; the rest collapse into "+n" (the case study lists them all). */
export const STACK_PREVIEW = 4;

export function stackPreview(stack: readonly string[], max = STACK_PREVIEW) {
  return { shown: stack.slice(0, max), more: Math.max(0, stack.length - max) };
}

/** "Company · DGSI · 2024 – present": context, then company and period when visible. */
export function projectMeta(project: Project): Segments {
  return [CONTEXT_LABEL[project.context], project.company ?? '', project.period ?? ''];
}

/** Where a project card can send people, after placeholder rules. */
export type ProjectDestination =
  | { readonly kind: 'internal'; readonly href: Route<CaseStudyPath>; readonly label: string }
  /** `detail` is read after the label by screen readers only, e.g. " listing for Eventbook Exhibitors". */
  | { readonly kind: 'external'; readonly href: string; readonly label: Field; readonly detail?: string }
  | { readonly kind: 'store'; readonly listing: StoreListing }
  /** A link whose URL is still a placeholder: a non-link chip in label mode. */
  | { readonly kind: 'pending'; readonly label: Field };
type InternalDestination = Extract<ProjectDestination, { readonly kind: 'internal' }>;

export function projectDestinations(project: Project, mode: PlaceholderMode): readonly ProjectDestination[] {
  const destinations: ProjectDestination[] = [];
  const caseStudy = project.caseStudy ?? project.links.find((link) => link.kind === 'case-study')?.slug;
  if (caseStudy) destinations.push({ kind: 'internal', href: caseStudyHref(caseStudy), label: 'Read the case study' });

  for (const link of project.links) {
    switch (link.kind) {
      case 'case-study':
        break; // already first
      case 'repo':
      case 'site': {
        const href = fieldOrNull(link.href, mode);
        if (href === null) break;
        destinations.push(hasToken(href) ? { kind: 'pending', label: link.label } : { kind: 'external', href, label: link.label });
        break;
      }
      case 'store': {
        const listing = listingById(link.listing);
        if (listing) destinations.push({ kind: 'store', listing });
        break;
      }
      case 'store-page':
        // Like StoreLink: the visible "Google Play" also says which app it lists.
        destinations.push({
          kind: 'external',
          href: link.href,
          label: STORE_NAME[link.platform],
          detail: ` listing for ${project.title}`,
        });
        break;
    }
  }
  return destinations;
}

/**
 * The status shape and its label. A placeholder label (e.g. Citizen Web's "[[Status to confirm]]")
 * means the status itself is unconfirmed, so no shape claims one: label mode shows the marked
 * placeholder alone, hide mode drops the line.
 */
function StatusLine({ project, mode }: { readonly project: Project; readonly mode: PlaceholderMode }) {
  const label = fieldOrNull(project.statusLabel, mode);
  if (label === null) return null;
  return (
    <p className="flex items-center gap-2 text-meta text-ink-2">
      {hasToken(label) ? null : <StatusDot status={project.status} />}
      <Copy text={label} mode={mode} />
    </p>
  );
}

function RoleLine({ project, mode }: { readonly project: Project; readonly mode: PlaceholderMode }) {
  if (fieldOrNull(project.role, mode) === null) return null;
  return (
    <p className="text-meta text-ink-3">
      <span className="font-semibold text-ink-2">Role: </span>
      <Copy text={project.role} mode={mode} />
    </p>
  );
}

function StackChips({ stack }: { readonly stack: readonly string[] }) {
  if (stack.length === 0) return null;
  const { shown, more } = stackPreview(stack);
  return (
    <ul aria-label="Tech stack" className="flex flex-wrap gap-1.5">
      {shown.map((item) => (
        <li key={item}>
          <Chip size="sm">{item}</Chip>
        </li>
      ))}
      {more > 0 ? (
        <li>
          <Chip size="sm">
            +{more}
            <span className="sr-only"> more</span>
          </Chip>
        </li>
      ) : null}
    </ul>
  );
}

/** The arrow cue on a whole-card link; the link itself is the title. */
function CardCue({ children }: { readonly children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center gap-1.5 text-meta font-semibold text-ink transition-colors duration-(--dur-1) group-hover/project:text-accent-ink"
    >
      {children}
      <Icon name="arrow-right" size={14} />
    </span>
  );
}

function DestinationLinks({ destinations, mode }: { readonly destinations: readonly ProjectDestination[]; readonly mode: PlaceholderMode }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {destinations.map((destination, index) => (
        <li key={index}>
          {destination.kind === 'internal' ? (
            <ButtonLink href={destination.href} variant="secondary" size="sm" icon="arrow-right">
              {destination.label}
            </ButtonLink>
          ) : destination.kind === 'external' ? (
            <ExternalLink href={destination.href} className="text-meta">
              <Copy text={destination.label} mode={mode} />
              {destination.detail ? <span className="sr-only">{destination.detail}</span> : null}
            </ExternalLink>
          ) : destination.kind === 'store' ? (
            <StoreLink listing={destination.listing} className="text-meta" />
          ) : (
            <Chip tone="ph" size="sm" className="border-dashed border-ph-ink">
              <Copy text={destination.label} mode={mode} />
              <span className="sr-only"> (link not added yet)</span>
            </Chip>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The project title; it is the card's one link when the card is a whole-card link. */
function Title({
  project,
  href,
  className,
  as: Heading,
}: {
  readonly project: Project;
  readonly href: Route<CaseStudyPath> | null;
  readonly className: string;
  readonly as: 'h2' | 'h3';
}) {
  return (
    <Heading className={className}>
      {href === null ? (
        project.title
      ) : (
        <SiteLink href={href} className={stretchedLinkClass}>
          {project.title}
        </SiteLink>
      )}
    </Heading>
  );
}

/**
 * A project card in one of three looks, composed from Card, Chip, StatusDot and ButtonLink.
 * A card becomes one whole-card link (hover lift, title as the link) only when its single
 * destination is a case study; otherwise its links are listed and the card does not lift
 * (design §8). External links always stay explicit, so a new tab never opens by surprise.
 */
export function ProjectCard({
  project,
  look,
  phone,
  direction = 'next',
  headingLevel = 'h3',
  as = 'article',
  mode = site.placeholders,
  className,
}: ProjectCardProps) {
  const destinations = projectDestinations(project, mode);
  const links = destinations.filter((destination) => destination.kind !== 'pending');
  const first = links.length === 1 ? links[0] : undefined;
  const only = first?.kind === 'internal' ? first : undefined;
  const stretchedHref = only?.href ?? null;
  const example = mode === 'label' && project.example === true ? <ExampleTag /> : null;

  if (look === 'adjacent') {
    const internal = destinations.find((destination): destination is InternalDestination => destination.kind === 'internal');
    return (
      <Card as={as} interactive={internal !== undefined} className={cn('group/project flex flex-col gap-2', className)}>
        <p
          className={cn(
            'flex items-center gap-1.5 text-eyebrow text-ink-3 uppercase',
            direction === 'next' && 'justify-end',
          )}
        >
          {direction === 'previous' ? <Icon name="arrow-left" size={14} /> : null}
          {direction === 'previous' ? 'Previous case study' : 'Next case study'}
          {direction === 'next' ? <Icon name="arrow-right" size={14} /> : null}
        </p>
        <Title
          project={project}
          href={internal?.href ?? null}
          as={headingLevel}
          className={cn('text-h3-hero text-ink', direction === 'next' && 'text-end')}
        />
        <Copy
          as="p"
          text={project.summary}
          mode={mode}
          className={cn('text-body-sm text-ink-3', direction === 'next' && 'text-end')}
        />
      </Card>
    );
  }

  const footer = only ? (
    <CardCue>{only.label}</CardCue>
  ) : destinations.length > 0 ? (
    <DestinationLinks destinations={destinations} mode={mode} />
  ) : null;

  if (look === 'compact') {
    return (
      <Card
        as={as}
        interactive={stretchedHref !== null}
        className={cn('group/project flex flex-col gap-3', className)}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <IconTile icon={project.icon} tone="solid" size={32} />
          <Chip size="sm" className="shrink-0">
            <MetaLine as="span" segments={[CONTEXT_LABEL[project.context], project.company ?? '']} mode={mode} />
          </Chip>
        </div>
        <div className="flex flex-col items-start gap-1">
          <Title project={project} href={stretchedHref} as={headingLevel} className="text-card-title text-ink" />
          {example}
        </div>
        <Copy as="p" text={project.summary} mode={mode} className="text-body-sm text-ink-3" />
        <RoleLine project={project} mode={mode} />
        <StackChips stack={project.stack} />
        <div className="mt-auto flex flex-col gap-3 pt-1">
          <StatusLine project={project} mode={mode} />
          {footer}
        </div>
      </Card>
    );
  }

  return (
    <Card
      as={as}
      interactive={stretchedHref !== null}
      className={cn('group/project @container flex flex-col', className)}
    >
      <div className="grid gap-5 @xl:grid-cols-[auto_minmax(0,1fr)] @xl:items-center">
        {phone ? <div className="flex justify-center">{phone}</div> : null}
        <div className="flex min-w-0 flex-col gap-3">
          <MetaLine segments={projectMeta(project)} mode={mode} className="text-eyebrow text-accent-ink uppercase" />
          <div className="flex flex-col items-start gap-1">
            <Title project={project} href={stretchedHref} as={headingLevel} className="text-h3-hero text-ink" />
            {example}
          </div>
          <Copy as="p" text={project.summary} mode={mode} className="text-body-sm text-ink-2" />
          <StatusLine project={project} mode={mode} />
          <StackChips stack={project.stack} />
          {footer ? <div className="pt-1">{footer}</div> : null}
        </div>
      </div>
    </Card>
  );
}
