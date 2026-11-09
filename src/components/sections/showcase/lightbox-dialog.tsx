'use client';

import { Fragment, useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { LightboxEntry } from '@/components/sections/showcase/showcase-provider';
import { PHONE_SCALE } from '@/components/showcase/phone-frame';
import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { fitScale } from '@/lib/showcase-filters';

/*
 * The Showcase lightbox (design §7): a full-screen Radix dialog (ui/dialog) with the screen large
 * beside its details (stacked on narrow screens), Previous / Next buttons, ← / → keys and Esc.
 * Focus is trapped while open; ShowcaseProvider returns it to the tile on close.
 *
 * The screen is the tile's own server-rendered element (size 'inherit'), drawn again here with a
 * --ps that fits the space under the header: up to 2xl on a tall screen, fitted to the viewport
 * height on a phone. A brandable replica keeps its skin through its BrandScope's variables.
 * Loaded lazily (default export) on the first intent to open a tile.
 */

/** Space kept below the screen, in CSS px. */
const STAGE_BOTTOM = 16;

export interface LightboxDialogProps {
  readonly open: boolean;
  readonly entry: LightboxEntry;
  /** 1-based position among the screens the filters show. */
  readonly position: number;
  readonly total: number;
  readonly onStep: (delta: number) => void;
  readonly onClose: () => void;
}

/** True when an arrow key belongs to a control that uses it (none in the lightbox today). */
function editable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export default function LightboxDialog({ open, entry, position, total, onStep, onClose }: LightboxDialogProps): ReactNode {
  // A callback ref in state: Radix mounts the portal content a render after this component, so
  // the fitting effect has to run again once the stage exists.
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<number | null>(null);
  const canStep = total > 1;

  // ← / → step through the screens the filters show (wrapping). Modified keys are left alone:
  // Alt+← is the browser's Back.
  useEffect(() => {
    if (!open || !canStep) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || editable(event.target)) return;
      event.preventDefault();
      onStep(event.key === 'ArrowLeft' ? -1 : 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, canStep, onStep]);

  // Fit the screen into the dialog under its header and toolbar, measured before paint.
  useLayoutEffect(() => {
    if (!open || !stage) return;
    const fit = (): void => {
      const dialog = stage.closest<HTMLElement>('[role="dialog"]');
      const viewport = dialog ?? document.documentElement;
      const offset = stage.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
      const height = viewport.clientHeight - offset - STAGE_BOTTOM;
      setScale(fitScale(stage.clientWidth, height, entry.ratio, PHONE_SCALE.xs, PHONE_SCALE['2xl']));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [open, stage, entry.ratio]);

  const stageStyle = { ...entry.brand?.vars, '--ps': String(scale ?? PHONE_SCALE.xl) } as CSSProperties;

  return (
    <Dialog
      look="fullscreen"
      title={entry.title}
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      closeLabel="Close"
    >
      <div className="flex w-full flex-col gap-4" data-lightbox="">
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" icon="chevron-left" onClick={() => onStep(-1)} disabled={!canStep}>
            Previous<span className="sr-only"> screen</span>
          </Button>
          <p className="text-meta text-ink-2 tabular-nums" aria-hidden="true" data-lightbox-position="">
            {position} of {total}
          </p>
          <Button variant="secondary" size="sm" icon="chevron-right" iconAt="end" onClick={() => onStep(1)} disabled={!canStep}>
            Next<span className="sr-only"> screen</span>
          </Button>
        </div>
        <p role="status" className="sr-only">
          {`Screen ${position} of ${total}: ${entry.title}`}
        </p>
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-8">
          <div ref={setStage} className="flex min-w-0 justify-center" style={stageStyle} data-lightbox-stage="">
            <Fragment key={entry.id}>{entry.screen}</Fragment>
          </div>
          <div className="flex min-w-0 flex-col gap-5 pb-2" data-lightbox-details="">
            {entry.details}
            {entry.brand ? (
              <p className="text-meta text-ink-2">
                Shown in the <strong className="font-semibold text-ink">{entry.brand.name}</strong> skin. Brand colours re-skin
                headers, tabs and buttons; emergency colours never change.
              </p>
            ) : null}
            <ButtonLink href={entry.caseStudy.href} variant="secondary" size="sm" icon="arrow-right" className="self-start">
              {entry.caseStudy.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
