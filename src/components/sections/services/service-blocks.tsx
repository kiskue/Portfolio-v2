import { caseStudyBySlug } from '@/content/derived';
import { site } from '@/content/site';
import type { Field, PlaceholderMode, Service } from '@/content/types';
import { Chip, ExampleTag } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { inlineLinkClass } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { NumberedList } from '@/components/ui/numbered-list';
import { SiteLink } from '@/components/ui/site-link';
import { fieldOrNull } from '@/lib/placeholder';
import { caseStudyHref } from '@/lib/routes';

export interface ServiceBlocksProps {
  /** The services to show, already filtered with visible(). Order is the numbering (01–05). */
  readonly services: readonly Service[];
  readonly mode?: PlaceholderMode;
}

/** A labelled bullet list; items that hide mode removes are skipped, and an empty list renders nothing. */
function BulletGroup({
  title,
  items,
  mode,
}: {
  readonly title: string;
  readonly items: readonly Field[];
  readonly mode: PlaceholderMode;
}) {
  const shown = items.filter((item) => fieldOrNull(item, mode) !== null);
  if (shown.length === 0) return null;
  return (
    <div>
      <h3 className="text-eyebrow text-ink-3 uppercase">{title}</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {shown.map((item, index) => (
          <li key={index} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-accent" />
            <Copy text={item} mode={mode} as="span" className="min-w-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Engagement: [[Typical timeline and pricing]]"; the whole line goes when hide mode drops the field. */
function EngagementLine({ engagement, mode }: { readonly engagement: Field; readonly mode: PlaceholderMode }) {
  if (fieldOrNull(engagement, mode) === null) return null;
  return (
    <p className="text-meta text-ink-3" data-engagement="">
      <span className="font-semibold text-ink-2">Engagement: </span>
      <Copy text={engagement} mode={mode} />
    </p>
  );
}

function ServiceBody({ service, mode }: { readonly service: Service; readonly mode: PlaceholderMode }) {
  const study = caseStudyBySlug(service.proof.slug);
  return (
    <div className="flex flex-col gap-5 text-body-sm text-ink-2">
      {mode === 'label' && service.example === true ? <ExampleTag className="self-start" /> : null}
      <BulletGroup title="Good fit if…" items={service.goodFit} mode={mode} />
      <BulletGroup title="Deliverables" items={service.deliverables} mode={mode} />
      <p className="text-meta text-ink-3">
        <span className="font-semibold text-ink-2">Proof: </span>
        <SiteLink href={caseStudyHref(study.slug, service.proof.anchor)} className={inlineLinkClass} data-proof="">
          {study.title} case study
          <Icon name="arrow-right" size={14} className="ms-1 inline-block align-[-0.125em]" />
        </SiteLink>
      </p>
      {service.stack.length > 0 ? (
        <ul aria-label={`${service.short}: stack`} className="flex flex-wrap gap-1.5">
          {service.stack.map((item) => (
            <li key={item}>
              <Chip size="sm">{item}</Chip>
            </li>
          ))}
        </ul>
      ) : null}
      <EngagementLine engagement={service.engagement} mode={mode} />
    </div>
  );
}

/**
 * The five service blocks (design §8): NumberedList blocks with the 64px mono index, two columns
 * when there is room. Each block's element id is its ServiceId, so servicesHref(id) from the
 * Home Services card lands on it. Every block: "Good fit if…" bullets, deliverables, a proof link
 * into a case study, stack chips and the engagement line (a placeholder until priced).
 */
export function ServiceBlocks({ services, mode = site.placeholders }: ServiceBlocksProps) {
  return (
    <NumberedList
      look="blocks"
      headingLevel="h2"
      items={services.map((service) => ({
        id: service.id,
        label: service.title,
        body: <ServiceBody service={service} mode={mode} />,
      }))}
    />
  );
}
