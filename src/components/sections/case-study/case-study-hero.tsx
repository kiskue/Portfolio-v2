import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { BrandSlot, FlankBrand } from '@/components/sections/case-study/brand-parts.client';
import { BrandStoreRow } from '@/components/sections/case-study/store-facts';
import { BrandSwitcher } from '@/components/showcase/brand-scope';
import { GlimpsePlayer } from '@/components/showcase/glimpse';
import { ScreenView } from '@/components/showcase/screen-view';
import { buttonVariants } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';
import { SiteLink } from '@/components/ui/site-link';
import { Stat } from '@/components/ui/stat';
import { projects } from '@/content/projects';
import { site } from '@/content/site';
import { brandById, brandsFor, caseStudyMetrics, citizenStoreFacts, defaultBrand, getFigure } from '@/content/derived';
import type { Brand, BrandId, CaseStudy, ScreenSource } from '@/content/types';
import { brandVars } from '@/lib/brand-vars';
import { cn } from '@/lib/cn';
import { fieldOrNull, visible } from '@/lib/placeholder';
import { projectsHref } from '@/lib/routes';

/*
 * The case-study hero (PLAN case-study template 1; design §6.1). Left: the breadcrumb, the page
 * header (eyebrow, H1, summary and the Get in touch pill), three stats and the actions (the
 * selected brand's store links, or a status chip and "Jump to architecture"). Right: the phone
 * stage, a hero glimpse with two flank phones peeking from behind, then the brand switcher.
 *
 * The glimpse phone is the receiving end of the site's one View Transition: GlimpsePlayer wraps it
 * in <ViewTransition name="phone-<slug>" share="morph" default="none"> (morph is on by default).
 * The flanks are plain phones with no transition name, so the name stays unique on the page.
 */

function Breadcrumb({ study }: { readonly study: CaseStudy }): ReactNode {
  return (
    <nav aria-label="Breadcrumb" className="text-meta text-ink-3">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <SiteLink href={projectsHref()} className="font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            Projects
          </SiteLink>
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="chevron-right" size={14} className="text-ink-4" />
          <span aria-current="page">{study.title}</span>
        </li>
      </ol>
    </nav>
  );
}

/** The three hero stats (metric ids in heroStats), with store figures computed from the store data. */
function HeroStats({ study }: { readonly study: CaseStudy }): ReactNode {
  const metrics = new Map(visible(caseStudyMetrics(study), site.placeholders).map((metric) => [metric.id, metric]));
  const stats = study.heroStats.flatMap((id) => metrics.get(id) ?? []);
  if (stats.length === 0) return null;
  return (
    <ul aria-label="Key figures" className="grid gap-x-6 gap-y-4 @lg/hero-text:grid-cols-3">
      {stats.map((metric) => (
        <Stat
          key={metric.id}
          as="li"
          value={metric.value}
          label={metric.label}
          className="@max-lg/hero-text:grid @max-lg/hero-text:grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)] @max-lg/hero-text:items-baseline @max-lg/hero-text:gap-x-4"
        />
      ))}
    </ul>
  );
}

/** Citizen: the selected brand's store icon and text links (one row per brand, one shown). */
function StoreActions(): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-eyebrow text-ink-3 uppercase">On the stores</p>
      {citizenStoreFacts.map((facts) => (
        <BrandSlot key={facts.brand.id} brand={facts.brand.id} isDefault={facts.brand.isDefault === true}>
          <BrandStoreRow facts={facts} />
        </BrandSlot>
      ))}
    </div>
  );
}

/** SME and Responder: the project's status chip, and a jump to the architecture section. */
function StatusActions({ study }: { readonly study: CaseStudy }): ReactNode {
  const project = projects.find((candidate) => candidate.slug === study.projectSlug);
  const label = project ? fieldOrNull(project.statusLabel, site.placeholders) : null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {project && label ? (
        <Chip status={project.status}>
          <Copy text={label} />
        </Chip>
      ) : null}
      {study.sections.includes('architecture') ? (
        <a href="#architecture" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          Jump to architecture
          <Icon name="chevron-down" size={14} />
        </a>
      ) : null}
    </div>
  );
}

/** The brands of the same app that share a brand's colours (same primary), for the flank's twin check. */
function sameColours(brand: Brand): readonly BrandId[] {
  const primary = brand.palette.primary.toLowerCase();
  const family: readonly Brand[] = brand.app === 'citizen' ? brandsFor('citizen') : brandsFor('responder');
  return family.filter((candidate) => candidate.palette.primary.toLowerCase() === primary).map((candidate) => candidate.id);
}

/**
 * A flank's phone (sm, no transition name). In a Defensys hero it follows the selected brand; a flank
 * the content gives its own brand keeps it, unless that would twin the main phone (FlankBrand).
 */
function FlankPhone({ study, source }: { readonly study: CaseStudy; readonly source: ScreenSource }): ReactNode {
  if (study.app === 'sme' || source.kind !== 'replica') return <ScreenView source={source} size="sm" />;
  const phone = <ScreenView source={source} size="sm" brandMode="inherit" />;
  if (source.brand === undefined) return phone;
  const own = brandById(source.brand);
  return (
    <FlankBrand vars={brandVars(own)} fallback={brandVars(defaultBrand(study.app))} collidesWith={sameColours(own)}>
      {phone}
    </FlankBrand>
  );
}

/** A flank peeking from behind the main phone; hidden where the stage is too narrow for it. */
function Flank({ study, source, side }: { readonly study: CaseStudy; readonly source: ScreenSource; readonly side: 'start' | 'end' }): ReactNode {
  return (
    <div className={cn('absolute top-12 z-0 hidden @sm/stage:block', side === 'start' ? 'start-0' : 'end-0')} data-flank={side}>
      <FlankPhone study={study} source={source} />
    </div>
  );
}

/** "FIG 1.4 Suki storefront and FIG 1.5 Live delivery tracking", or one figure in other brands' colours. */
function FlankNames({ flanks }: { readonly flanks: readonly ScreenSource[] }): ReactNode {
  const replicas = flanks.flatMap((source) => (source.kind === 'replica' ? [source] : []));
  const [first] = replicas;
  if (!first) return null;
  const sameScreen = replicas.every((source) => source.figure === first.figure && source.brand !== undefined);
  const figures = sameScreen ? [first.figure] : replicas.map((source) => source.figure);
  return (
    <>
      Beside it:{' '}
      {figures.map((id, index) => (
        <span key={`${id}-${index}`}>
          {index > 0 ? ' and ' : null}
          <span className="font-mono text-fig text-ink-2">FIG {id}</span> {getFigure(id).title}
        </span>
      ))}
      {sameScreen ? ', in other brands’ colours' : null}.
    </>
  );
}

function HeroStage({ study }: { readonly study: CaseStudy }): ReactNode {
  const [start, end] = study.hero.flanks;
  const caption = fieldOrNull(study.hero.caption, site.placeholders);
  return (
    <div className="@container/stage flex min-w-0 flex-col items-center gap-6">
      <figure className="flex w-full max-w-[26.25rem] flex-col gap-3" data-hero-stage="">
        <div className="relative">
          <Flank study={study} source={start} side="start" />
          <GlimpsePlayer glimpses={[study.hero.glimpse]} layout="hero" size="inherit" id={`hero-${study.slug}`} className="relative z-[1]" />
          <Flank study={study} source={end} side="end" />
        </div>
        <figcaption className="text-center text-meta text-ink-3">
          {caption ? <Copy text={caption} className="font-semibold text-ink-2" /> : null}{' '}
          <span className="hidden @sm/stage:inline">
            <FlankNames flanks={study.hero.flanks} />
          </span>
        </figcaption>
      </figure>
      {study.app === 'sme' ? null : <BrandSwitcher className="w-full max-w-[26.25rem]" />}
    </div>
  );
}

export function CaseStudyHero({ study }: { readonly study: CaseStudy }): ReactNode {
  const factLine = fieldOrNull(study.factLine, site.placeholders);
  return (
    <header className="@container/hero" data-cs-hero="">
      <div className="grid gap-10 @4xl/hero:grid-cols-[minmax(0,1fr)_26.25rem] @4xl/hero:items-start @4xl/hero:gap-12">
        <div className="@container/hero-text flex min-w-0 flex-col gap-6">
          <Breadcrumb study={study} />
          <PageHeader title={study.title} eyebrow={study.eyebrow} intro={study.summary} id="case-study-title" />
          <HeroStats study={study} />
          {study.app === 'citizen' ? <StoreActions /> : <StatusActions study={study} />}
          {factLine ? (
            <p className="flex max-w-[65ch] gap-2 text-meta text-ink-3">
              <Icon name="info" size={16} className="mt-0.5 text-ink-4" />
              <Copy text={factLine} />
            </p>
          ) : null}
        </div>
        <HeroStage study={study} />
      </div>
    </header>
  );
}
