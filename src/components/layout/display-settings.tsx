'use client';

import { cloneElement, lazy, Suspense, useId, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';

/*
 * Display settings (design §9, PLAN → Motion): Theme System / Light / Dark and Motion System /
 * Reduce. The controls and the Radix popover (with floating-ui) load on first intent (hover,
 * focus or touch on the trigger), so this first-load island is only the trigger wiring.
 * No class merging here either: tailwind-merge stays out of the first-load bundle.
 */
const loadPopover = () => import('@/components/layout/display-settings-popover');
const loadPanel = () => import('@/components/layout/display-settings-panel');
const DisplaySettingsPopover = lazy(loadPopover);
const DisplaySettingsPanel = lazy(loadPanel);

const ROW = 'flex items-center gap-3';
const classes = (...parts: (string | undefined)[]): string => parts.filter(Boolean).join(' ');

type Trigger = ReactElement<ComponentProps<'button'>>;

export interface DisplaySettingsProps {
  /**
   * 'popover': a Radix popover above the trigger (the rail footer on desktop).
   * 'inline': a disclosure that opens below the trigger's row (the menu sheet and the mobile
   * footer; never a popover nested in the sheet).
   */
  readonly presentation: 'popover' | 'inline';
  /** The button that opens the settings, rendered on the server (e.g. the round accessibility button). */
  readonly trigger: Trigger;
  /** Shown after the trigger in the same row, e.g. the © line (keep it free of focusable elements, so the panel stays the next tab stop). */
  readonly children?: ReactNode;
  readonly className?: string;
}

function PopoverPresentation({ trigger, children, className }: Omit<DisplaySettingsProps, 'presentation'>) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const preload = (): void => void loadPopover();

  // Until the popover code is in, a plain button stands in for the Radix trigger. Its click
  // swaps in the popover, which opens at once and moves focus inside.
  const standIn = cloneElement(trigger, {
    'aria-haspopup': 'dialog',
    'aria-expanded': false,
    onPointerEnter: preload,
    onFocus: preload,
    onTouchStart: preload,
    onClick: () => {
      setRequested(true);
      setOpen(true);
    },
  });

  return (
    <div className={classes(ROW, className)}>
      {requested ? (
        <Suspense fallback={standIn}>
          <DisplaySettingsPopover trigger={trigger} open={open} onOpenChange={setOpen} />
        </Suspense>
      ) : (
        standIn
      )}
      {children}
    </div>
  );
}

function InlinePresentation({ trigger, children, className }: Omit<DisplaySettingsProps, 'presentation'>) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const preload = (): void => void loadPanel();

  const toggle = cloneElement(trigger, {
    'aria-expanded': open,
    'aria-controls': panelId,
    onPointerEnter: preload,
    onFocus: preload,
    onTouchStart: preload,
    onClick: () => setOpen((value) => !value),
  });

  return (
    <div className={classes('flex flex-col', className)}>
      <div className={ROW}>
        {toggle}
        {children}
      </div>
      <div id={panelId} hidden={!open} className="mt-4">
        {open ? (
          <Suspense fallback={null}>
            <DisplaySettingsPanel framed />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Theme and Motion settings bound to the display store: a choice applies at once, persists in
 * localStorage and is painted before first paint on the next load.
 */
export function DisplaySettings({ presentation, ...props }: DisplaySettingsProps) {
  return presentation === 'popover' ? <PopoverPresentation {...props} /> : <InlinePresentation {...props} />;
}
