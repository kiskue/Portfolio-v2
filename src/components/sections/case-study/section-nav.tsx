import type { ReactNode } from 'react';
import { SECTION_LABELS } from '@/components/sections/case-study/case-study-section';
import { SectionNavDisclosure } from '@/components/sections/case-study/section-nav.client';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { listIndex } from '@/components/ui/numbered-list';
import type { CaseStudy } from '@/content/types';
import { cn } from '@/lib/cn';

/*
 * The case study's static, sticky "On this page" list (PLAN case-study template; design §6
 * "SectionNav", minus the scroll-spy the review cut). One component at every width: a glass pill
 * that sticks under the top bar (beside the sidebar from 1280px) and opens the section list, built
 * from study.sections. The links are plain #anchors to the section ids; nothing watches the scroll
 * position, and the label never changes.
 */
export function SectionNav({ study, className }: { readonly study: CaseStudy; readonly className?: string }): ReactNode {
  return (
    <nav
      aria-label="On this page"
      className={cn('sticky top-[4.25rem] z-30 w-fit self-start xl:top-4 print:hidden', className)}
      data-section-nav-root=""
    >
      <SectionNavDisclosure
        className="group relative"
        summaryClassName={[
          'flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-raised/85 px-4',
          'text-body-sm font-semibold text-ink shadow-sm backdrop-blur-md select-none',
          'transition-colors duration-(--dur-1) hover:border-line-strong [&::-webkit-details-marker]:hidden',
        ].join(' ')}
        summary={
          <>
            <span className="font-medium text-ink-3 max-sm:sr-only">{study.title} ·</span>
            On this page
            <Icon name="chevron-down" size={16} className="text-ink-3 transition-transform duration-(--dur-2) group-open:rotate-180" />
          </>
        }
      >
        <Card
          surface="raised"
          radius="card"
          pad="sm"
          elevation="high"
          className="absolute start-0 top-full mt-2 w-max max-w-[min(20rem,calc(100vw-2rem))]"
        >
          <ol className="flex flex-col">
            {study.sections.map((key, index) => (
              <li key={key}>
                <a
                  href={`#${key}`}
                  className="flex min-h-10 items-center gap-3 rounded-control px-3 py-2 text-body-sm font-semibold text-ink-2 transition-colors duration-(--dur-1) hover:bg-sunken hover:text-ink"
                >
                  <span aria-hidden="true" className="w-5 font-mono text-fig text-ink-4 tabular-nums">
                    {listIndex(index)}
                  </span>
                  {SECTION_LABELS[key]}
                </a>
              </li>
            ))}
          </ol>
        </Card>
      </SectionNavDisclosure>
    </nav>
  );
}
