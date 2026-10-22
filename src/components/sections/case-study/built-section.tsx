import type { ReactNode } from 'react';
import { CaseStudySection, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { ScreenFigure } from '@/components/showcase/screen-figure';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { listIndex } from '@/components/ui/numbered-list';
import type { Rollout } from '@/content/types';

/*
 * Section 4, What I built (#built). Static feature rows, each with its own md phone, at every width:
 * the PLAN cut the scrollytelling (review §3 cut 1), so there is no sticky phone and no scroll
 * observer. Each phone keeps the brand its content names (ScreenView 'own'), so a row shows what it
 * says even while the hero switcher re-skins other phones. A feature that is not plainly shipped
 * says so ("In rollout", "In progress").
 */

const ROLLOUT_LABEL: Readonly<Record<Exclude<Rollout, 'shipped'>, string>> = {
  'in-rollout': 'In rollout',
  'in-progress': 'In progress',
};

export function BuiltSection({ study }: SectionProps): ReactNode {
  return (
    <CaseStudySection id="built">
      {/* Containers cannot query themselves: each grid sits inside its container. */}
      <div className="@container/built">
        <ol className="grid gap-5 @5xl/built:grid-cols-2">
          {study.features.map((feature, index) => {
            const rollout = feature.rollout && feature.rollout !== 'shipped' ? ROLLOUT_LABEL[feature.rollout] : null;
            return (
              <Card key={feature.id} as="li" surface="surface" radius="card" pad="md" className="@container/feature" data-feature={feature.id}>
                {/* Stacked, the phone sits at the bottom, so phones line up across a row of cards. */}
                <div className="grid h-full grid-rows-[auto_1fr] gap-6 @lg/feature:grid-cols-[minmax(0,1fr)_auto] @lg/feature:grid-rows-none @lg/feature:items-center">
                  <div className="flex min-w-0 flex-col items-start gap-2">
                    <span aria-hidden="true" className="font-mono text-fig text-ink-4 tabular-nums">
                      {listIndex(index)}
                    </span>
                    <h3 className="text-h3-hero text-ink">{feature.title}</h3>
                    {rollout ? <Chip size="sm">{rollout}</Chip> : null}
                    <Copy as="p" text={feature.body} className="text-body-sm text-ink-2" />
                  </div>
                  <ScreenFigure source={feature.screen} size="md" figureClassName="self-end justify-self-center @lg/feature:self-center" />
                </div>
              </Card>
            );
          })}
        </ol>
      </div>
    </CaseStudySection>
  );
}
