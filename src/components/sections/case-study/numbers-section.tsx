import type { ReactNode } from 'react';
import { CaseStudySection, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { Copy } from '@/components/ui/copy';
import { Stat } from '@/components/ui/stat';
import { caseStudyMetrics, type CaseStudyMetric } from '@/content/derived';
import { site } from '@/content/site';
import type { ISODate } from '@/content/types';
import { formatDate } from '@/lib/format';
import { visible } from '@/lib/placeholder';

/*
 * Section 9, Numbers, dated (design §6.9): a stat grid (two columns narrow, four wide), each figure
 * with where it comes from, then the dates they are counted as of, taken from the metrics' asOf.
 * Store figures (Citizen) are computed from the store data in derived.ts, not restated.
 */

/** "Oct 19, 2026", or "Oct 19, 2026 and Jan 5, 2027" when figures were counted on different days. */
function dates(metrics: readonly CaseStudyMetric[]): string | null {
  const unique = [...new Set<ISODate>(metrics.map((metric) => metric.asOf))].sort();
  return unique.length > 0 ? unique.map(formatDate).join(' and ') : null;
}

/** "Counted from source on Oct 19, 2026; store figures as of Oct 19, 2026." */
export function numbersFootnote(metrics: readonly CaseStudyMetric[]): string | null {
  const counted = dates(metrics.filter((metric) => !metric.store));
  const store = dates(metrics.filter((metric) => metric.store));
  const parts = [counted ? `Counted from source on ${counted}` : null, store ? `store figures as of ${store}` : null].filter(
    (part): part is string => part !== null,
  );
  if (parts.length === 0) return null;
  const sentence = parts.join('; ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

export function NumbersSection({ study }: SectionProps): ReactNode {
  const metrics = visible(caseStudyMetrics(study), site.placeholders);
  const footnote = numbersFootnote(metrics);
  return (
    <CaseStudySection id="numbers">
      <div className="@container/numbers">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 @3xl/numbers:grid-cols-4">
          {metrics.map((metric) => (
            <li key={metric.id} className="flex min-w-0 flex-col gap-2 border-t border-line pt-4" data-metric={metric.id}>
              <Stat value={metric.value} label={metric.label} />
              <Copy as="p" text={metric.source} className="text-[0.75rem] leading-4 text-ink-4" />
            </li>
          ))}
        </ul>
      </div>
      {footnote ? <p className="text-meta text-ink-3">{footnote}</p> : null}
    </CaseStudySection>
  );
}
