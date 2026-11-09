import type { ReactNode } from 'react';
import { CaseStudySection, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { FlowDiagram } from '@/components/sections/case-study/flow-diagram';

/** Section 7, Architecture: each diagram as a FlowDiagram (a semantic <ol> of lanes and connectors). */
export function ArchitectureSection({ study }: SectionProps): ReactNode {
  return (
    <CaseStudySection id="architecture" intro="How the parts connect, and who built each one: the key under each title explains the border styles.">
      <div className="flex flex-col gap-14">
        {study.architecture.map((diagram) => (
          <FlowDiagram key={diagram.id} diagram={diagram} />
        ))}
      </div>
    </CaseStudySection>
  );
}
