import './case-study.css';
import type { ReactNode } from 'react';
import { AiSection } from '@/components/sections/case-study/ai-section';
import { ArchitectureSection } from '@/components/sections/case-study/architecture-section';
import { AtAGlance } from '@/components/sections/case-study/at-a-glance';
import { BrandsSection } from '@/components/sections/case-study/brands-section';
import { BuiltSection } from '@/components/sections/case-study/built-section';
import { CaseStudyHero } from '@/components/sections/case-study/case-study-hero';
import type { SectionProps } from '@/components/sections/case-study/case-study-section';
import { ChallengesSection } from '@/components/sections/case-study/challenges-section';
import { NextSection } from '@/components/sections/case-study/next-section';
import { NumbersSection } from '@/components/sections/case-study/numbers-section';
import { ProblemSection } from '@/components/sections/case-study/problem-section';
import { ScreensSection } from '@/components/sections/case-study/screens-section';
import { SectionNav } from '@/components/sections/case-study/section-nav';
import { brandScopeProps } from '@/components/showcase/brand-options';
import { BrandScope } from '@/components/showcase/brand-scope';
import type { CaseStudy, CaseStudySectionKey } from '@/content/types';

/**
 * The one data-driven case-study template (PLAN case-study template; architecture D2): the hero,
 * the "On this page" pill, then study.sections in order, each key rendered by its component. The
 * map is exhaustive over CaseStudySectionKey, so a new key fails the type check until it has one.
 */
export const SECTION_COMPONENTS = {
  overview: AtAGlance,
  problem: ProblemSection,
  built: BuiltSection,
  ai: AiSection,
  brands: BrandsSection,
  screens: ScreensSection,
  architecture: ArchitectureSection,
  challenges: ChallengesSection,
  numbers: NumbersSection,
  next: NextSection,
} as const satisfies Record<CaseStudySectionKey, (props: SectionProps) => ReactNode>;

/**
 * A Defensys case study sits in ONE BrandScope (?brand=): the hero switcher, the #brands Preview
 * buttons, the hero phones and the Screens grid share the selection, and switching re-renders no
 * replica (CSS variables on the scope's display:contents wrapper). SME has no brands.
 */
export function CaseStudyTemplate({ study }: { readonly study: CaseStudy }): ReactNode {
  const content = (
    <>
      <CaseStudyHero study={study} />
      {/* A direct child of the article (the scope is display:contents), so it sticks to the end of it. */}
      <SectionNav study={study} className="mt-12 md:mt-16" />
      <div className="mt-8 flex flex-col gap-20 md:gap-24">
        {study.sections.map((key) => {
          const Section = SECTION_COMPONENTS[key];
          return <Section key={key} study={study} />;
        })}
      </div>
    </>
  );

  return (
    <article aria-labelledby="case-study-title" className="flex flex-col" data-case-study={study.slug}>
      {study.app === 'sme' ? content : <BrandScope {...brandScopeProps(study.app)}>{content}</BrandScope>}
    </article>
  );
}
