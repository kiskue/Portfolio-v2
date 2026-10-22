import type { ReactNode } from 'react';
import { CaseStudySection, SECTION_LABELS, type SectionProps } from '@/components/sections/case-study/case-study-section';
import { FlowDiagram } from '@/components/sections/case-study/flow-diagram';
import { ScreenFigure } from '@/components/showcase/screen-figure';
import { Card } from '@/components/ui/card';
import { Copy } from '@/components/ui/copy';
import { Icon } from '@/components/ui/icon';

/*
 * Section 5 for SME, #ai (design §6 "#ai"): a static trio of phones (no glimpse, no transition
 * name), the guardrails, then the AI pipeline as a FlowDiagram.
 */
export function AiSection({ study }: SectionProps): ReactNode {
  const special = study.specials.find((candidate) => candidate.kind === 'ai');
  if (special?.kind !== 'ai') return null;
  return (
    <CaseStudySection id="ai" eyebrow={SECTION_LABELS.ai} title={special.title}>
      <div className="@container/ai">
        <div className="grid gap-8 @4xl/ai:grid-cols-[auto_minmax(0,1fr)] @4xl/ai:items-start">
          <ul aria-label="AI screens" className="flex flex-wrap justify-center gap-4">
            {special.figures.map((figure) => (
              <li key={figure}>
                <ScreenFigure source={{ kind: 'replica', figure }} size="sm" />
              </li>
            ))}
          </ul>
          {special.guardrails.length > 0 ? (
            <Card surface="surface" radius="card" pad="md" className="flex flex-col gap-3">
              <h3 className="text-card-title text-ink">Guardrails</h3>
              <ul className="flex flex-col gap-2.5">
                {special.guardrails.map((guardrail, index) => (
                  <li key={index} className="flex gap-2.5 text-body-sm text-ink-2">
                    <Icon name="shield-check" size={18} className="mt-0.5 text-accent-ink" />
                    <Copy text={guardrail} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
      <FlowDiagram diagram={special.diagram} />
    </CaseStudySection>
  );
}
