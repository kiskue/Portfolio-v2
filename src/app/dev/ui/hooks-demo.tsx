'use client';

import { Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { useAutoplay } from '@/hooks/use-autoplay';
import { useInView } from '@/hooks/use-in-view';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSearchParam } from '@/hooks/use-search-param';
import { cn } from '@/lib/cn';

const DEMO_VALUES = ['one', 'two', 'three'] as const;
type DemoValue = (typeof DEMO_VALUES)[number];

const DEMO_OPTIONS: readonly SegmentedOption<DemoValue>[] = DEMO_VALUES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const MAX_RUNS = 3;

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}

/** Controlled SegmentedControl synced to ?demo= (inside Suspense, as useSearchParam requires). */
function SearchParamDemo({ id }: { readonly id: string }) {
  const [value, setValue] = useSearchParam<DemoValue>('demo', DEMO_VALUES, 'one');
  return (
    <SegmentedControl
      name={`${id}-search-param`}
      legend="useSearchParam('demo'): controlled, URL-synced"
      options={DEMO_OPTIONS}
      value={value}
      onValueChange={setValue}
      look="chips"
      size="sm"
    />
  );
}

/** A small client island that exercises useInView, useAutoplay, useReducedMotion and useSearchParam. */
export function HooksDemo({ id }: { readonly id: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { threshold: 0.5 });
  const autoplay = useAutoplay(stageRef, { maxRuns: MAX_RUNS });
  const reducedMotion = useReducedMotion();
  const offerPlay = autoplay.userPaused || autoplay.ended;

  const facts: readonly (readonly [string, string])[] = [
    ['in view (50%)', yesNo(inView)],
    ['running', yesNo(autoplay.running)],
    ['userPaused', yesNo(autoplay.userPaused)],
    ['ended', yesNo(autoplay.ended)],
    ['runs', `${autoplay.runs} of ${MAX_RUNS}`],
    ['reduced motion', yesNo(reducedMotion)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div ref={stageRef} className="flex flex-wrap items-center gap-5">
        <span
          aria-hidden="true"
          className={cn(
            'size-10 shrink-0 animate-spin rounded-full border-4 border-accent border-t-transparent',
            !autoplay.running && '[animation-play-state:paused]',
          )}
        />
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-meta">
          {facts.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-ink-3">{term}</dt>
              <dd className="font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-wrap gap-2">
        {offerPlay ? (
          <Button size="sm" variant="secondary" icon={autoplay.ended ? 'rotate-ccw' : 'play'} onClick={autoplay.play}>
            {autoplay.ended ? 'Replay' : 'Play'}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" icon="pause" onClick={autoplay.pause}>
            Pause
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={autoplay.endRun}>
          Complete a run
        </Button>
      </div>
      <Suspense fallback={<p className="text-meta text-ink-3">Loading the URL state…</p>}>
        <SearchParamDemo id={id} />
      </Suspense>
    </div>
  );
}
