import { caseStudyBySlug } from '@/content/derived';
import { site } from '@/content/site';
import type { PlaceholderMode, Testimonial } from '@/content/types';
import { Card } from '@/components/ui/card';
import { ExampleTag } from '@/components/ui/chip';
import { Copy, MetaLine } from '@/components/ui/copy';
import { inlineLinkClass } from '@/components/ui/external-link';
import { Icon } from '@/components/ui/icon';
import { SiteLink } from '@/components/ui/site-link';
import { cn } from '@/lib/cn';
import { hasToken } from '@/lib/placeholder';
import { caseStudyHref } from '@/lib/routes';

export interface QuoteCardProps {
  readonly testimonial: Testimonial;
  /** compact: the Home teaser (avatar, name, role, tags); full: the /testimonials card with the quote. */
  readonly look: 'compact' | 'full';
  readonly as?: 'div' | 'li';
  readonly mode?: PlaceholderMode;
  readonly className?: string;
}

/**
 * Up to two initials from a real name ("Ana Reyes" → "AR"). Null for a placeholder or blank
 * name, so a placeholder never gets invented initials.
 */
export function initials(name: string): string | null {
  if (hasToken(name)) return null;
  const words = name.trim().split(/\s+/).filter((word) => word !== '');
  const first = words[0];
  if (first === undefined) return null;
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const letter = (word: string) => (Array.from(word)[0] ?? '').toUpperCase();
  return letter(first) + (last ? letter(last) : '');
}

function Avatar({ name, size }: { readonly name: string; readonly size: 'sm' | 'md' }) {
  const text = initials(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-sunken font-semibold text-ink-2',
        size === 'sm' ? 'size-6 text-[0.75rem]' : 'size-10 text-body-sm',
      )}
    >
      {text ?? <Icon name="user-round" size={size === 'sm' ? 14 : 18} />}
    </span>
  );
}

/**
 * A testimonial, composed from Card. Example items (label mode) carry the Example tag; hide mode
 * drops them at the list level (visible()), and placeholder fields render nothing.
 */
export function QuoteCard({ testimonial, look, as = 'div', mode = site.placeholders, className }: QuoteCardProps) {
  const example = mode === 'label' && testimonial.example === true;
  const tags = <MetaLine segments={testimonial.tags} mode={mode} className="text-meta font-medium text-accent-ink" />;

  if (look === 'compact') {
    return (
      <Card as={as} surface="raised" radius="control" pad="sm" className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-center gap-2">
          <Avatar name={testimonial.name} size="sm" />
          <Copy as="strong" text={testimonial.name} mode={mode} className="min-w-0 text-meta font-bold text-ink" />
          {example ? <ExampleTag className="ms-auto" /> : null}
        </div>
        <Copy as="p" text={testimonial.role} mode={mode} className="text-meta text-ink-3" />
        {tags}
      </Card>
    );
  }

  const study = testimonial.project ? caseStudyBySlug(testimonial.project) : null;
  return (
    <Card as={as} surface="raised" radius="card" pad="md" className={cn('flex flex-col gap-4', className)}>
      <figure className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <span aria-hidden="true" className="font-serif text-[2.5rem] leading-[0.6] text-accent-ink">
            “
          </span>
          {example ? <ExampleTag /> : null}
        </div>
        <blockquote className="flex-1 text-[1.0625rem] leading-relaxed text-ink">
          <Copy as="p" text={testimonial.quote} mode={mode} />
        </blockquote>
        <figcaption className="flex items-center gap-3">
          <Avatar name={testimonial.name} size="md" />
          <span className="min-w-0">
            <Copy as="strong" text={testimonial.name} mode={mode} className="block text-body-sm font-bold text-ink" />
            <Copy as="span" text={testimonial.role} mode={mode} className="block text-meta text-ink-3" />
          </span>
        </figcaption>
      </figure>
      {tags}
      {study ? (
        <SiteLink href={caseStudyHref(study.slug)} className={cn(inlineLinkClass, 'self-start text-meta')}>
          {study.title} case study
          <Icon name="arrow-right" size={14} className="ms-1 inline-block align-[-0.125em]" />
        </SiteLink>
      ) : null}
    </Card>
  );
}
