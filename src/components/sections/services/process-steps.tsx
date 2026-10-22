import { site } from '@/content/site';
import type { PlaceholderMode, ProcessStep } from '@/content/types';
import { Copy } from '@/components/ui/copy';
import { listIndex } from '@/components/ui/numbered-list';
import { SectionHeader } from '@/components/ui/section-header';
import { cn } from '@/lib/cn';

export interface ProcessStepsProps {
  readonly steps: readonly ProcessStep[];
  readonly mode?: PlaceholderMode;
}

export const PROCESS_HEADING_ID = 'process-title';

/**
 * The process strip (design §8): Discover → Design → Build → Ship → Support, an ordered list
 * that runs down the page on narrow screens and across it once <main> is 56rem wide. The step
 * bodies are the owner's to confirm, so they are placeholders: marked in label mode, gone in
 * hide mode (the titles stay, so the strip still reads as a sequence).
 */
export function ProcessSteps({ steps, mode = site.placeholders }: ProcessStepsProps) {
  return (
    <section aria-labelledby={PROCESS_HEADING_ID} data-section="process">
      <SectionHeader as="h2" size="section" id={PROCESS_HEADING_ID} title="Process" />
      <ol className="mt-6 grid @4xl:grid-cols-5 @4xl:gap-5">
        {steps.map((step, position) => {
          const last = position === steps.length - 1;
          return (
            <li
              key={step.id}
              className={cn(
                'relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4',
                last ? 'pb-0' : 'pb-7',
                '@4xl:flex @4xl:flex-col @4xl:gap-3 @4xl:pb-0',
              )}
            >
              <span
                aria-hidden="true"
                className="relative z-10 flex size-8 items-center justify-center rounded-full border border-line-strong bg-raised font-mono text-fig text-ink-2 tabular-nums"
              >
                {listIndex(position)}
              </span>
              {last ? null : (
                <span
                  aria-hidden="true"
                  className={cn(
                    // Down from the marker to the next step, or across to it from 56rem.
                    'absolute start-[calc(1rem-0.5px)] top-8 bottom-0 w-px bg-line-strong/50',
                    '@4xl:start-8 @4xl:top-[calc(1rem-0.5px)] @4xl:bottom-auto @4xl:h-px @4xl:w-[calc(100%-0.75rem)]',
                  )}
                />
              )}
              <div className="min-w-0 pt-1 @4xl:pt-0">
                <h3 className="text-card-title text-ink">{step.title}</h3>
                <Copy as="p" text={step.body} mode={mode} className="mt-1 text-body-sm text-ink-3" />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
