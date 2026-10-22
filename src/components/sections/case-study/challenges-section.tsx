import type { ReactNode } from 'react';
import { CaseStudySection, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { Card } from '@/components/ui/card';
import { Chip, ExampleTag } from '@/components/ui/chip';
import { Copy } from '@/components/ui/copy';
import { site } from '@/content/site';
import type { Challenge } from '@/content/types';
import { cn } from '@/lib/cn';
import { visible } from '@/lib/placeholder';

/*
 * Section 8, Challenges (design §6.8): two columns of cards; the flagship spans both. Each card is
 * the challenge's Problem, What I did and Proof, as a description list.
 */

const PARTS = [
  ['problem', 'Problem'],
  ['did', 'What I did'],
  ['proof', 'Proof'],
] as const satisfies readonly (readonly [keyof Challenge, string])[];

export function ChallengesSection({ study }: SectionProps): ReactNode {
  const challenges = visible(study.challenges, site.placeholders);
  return (
    <CaseStudySection id="challenges">
      {/* A container cannot query itself: the grid sits inside it. */}
      <div className="@container/challenges">
        <ul className="grid gap-5 @3xl/challenges:grid-cols-2">
          {challenges.map((challenge) => (
            <Card
              key={challenge.id}
              as="li"
              surface={challenge.flagship ? 'raised' : 'surface'}
              radius="card"
              pad="md"
              className={cn('flex flex-col gap-4', challenge.flagship && '@3xl/challenges:col-span-2')}
              data-challenge={challenge.id}
              data-flagship={challenge.flagship ? '' : undefined}
            >
              <div className="flex flex-col items-start gap-2">
                {challenge.flagship ? (
                  <Chip size="sm" tone="accent">
                    Flagship challenge
                  </Chip>
                ) : null}
                <h3 className="text-h3-hero text-ink">{challenge.title}</h3>
                {site.placeholders === 'label' && challenge.example ? <ExampleTag /> : null}
              </div>
              <dl className={cn('grid gap-4', challenge.flagship && '@3xl/challenges:grid-cols-3 @3xl/challenges:gap-6')}>
                {PARTS.map(([key, term]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <dt className="text-eyebrow text-ink-3 uppercase">{term}</dt>
                    <dd>
                      <Copy as="p" text={challenge[key]} className="text-body-sm text-ink-2" />
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </ul>
      </div>
    </CaseStudySection>
  );
}
