import type { ReactNode } from 'react';
import { CaseStudySection, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { ScreenFigure } from '@/components/showcase/screen-figure';
import { SourcePane, SourceToggle } from '@/components/showcase/source-toggle';
import { StorePanes } from '@/components/showcase/store-panes';

/*
 * Section 6, Screens (#screens; PLAN case-study template 6, design §6.6): the coded replicas in a
 * grid of phones (two columns narrow, three or four wide), with the source toggle. The toggle
 * offers real screenshots only for a brand that has them (Citizen), one brand at a time: the
 * selected brand of the case study's BrandScope. Screenshots go through ScreenView: a 'raw' one
 * inside the frame, a 'marketing' one in a bordered card, never double-framed, always with its own
 * alt text. SME and Responder have no screenshots, so the toggle shows its fixed label instead.
 * In a Defensys case study the replicas inherit the selected brand.
 */
export function ScreensSection({ study }: SectionProps): ReactNode {
  return (
    <CaseStudySection id="screens">
      <SourceToggle counts={{ replica: study.screens.length, store: 0 }} label={`${study.title} screens`}>
        <SourcePane source="replica" className="@container/screens">
          <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-8 [--ps:0.3768] @2xl/screens:grid-cols-3 @2xl/screens:gap-x-6 @2xl/screens:[--ps:0.5024] @5xl/screens:grid-cols-4">
            {study.screens.map((source, index) => (
              <li key={index} className="min-w-0">
                <ScreenFigure source={source} size="inherit" brandMode={study.app === 'sme' ? 'own' : 'inherit'} />
              </li>
            ))}
          </ul>
        </SourcePane>
        {study.app === 'citizen' ? <StorePanes size="sm" headingLevel="h3" id="screens-store" /> : null}
      </SourceToggle>
    </CaseStudySection>
  );
}
