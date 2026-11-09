import type { ReactNode } from 'react';
import { CaseStudySection, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { Card } from '@/components/ui/card';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';

/** Section 3, the problem (design §6.3): the paragraphs, then the constraints the work had to meet. */
export function ProblemSection({ study }: SectionProps): ReactNode {
  const { paragraphs, constraints } = study.problem;
  return (
    <CaseStudySection id="problem">
      {/* A container cannot query itself: the grid sits inside it. */}
      <div className="@container/problem">
        <div className="grid gap-8 @3xl/problem:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] @3xl/problem:items-start">
          <div className="flex max-w-[65ch] flex-col gap-4 text-body text-ink-2">
            {paragraphs.map((paragraph, index) => (
              <Copy key={index} as="p" text={paragraph} />
            ))}
          </div>
          {constraints.length > 0 ? (
            <Card surface="sunken" radius="card" pad="md" className="flex flex-col gap-3">
              <h3 className="text-card-title text-ink">Constraints</h3>
              <ul className="flex flex-col gap-2.5">
                {constraints.map((constraint, index) => (
                  <li key={index} className="flex gap-2.5 text-body-sm text-ink-2">
                    <Icon name="check" size={18} className="mt-0.5 text-accent-ink" />
                    <Copy text={constraint} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </CaseStudySection>
  );
}
