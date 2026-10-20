'use client';

import type { ComponentProps, ReactElement } from 'react';
import { Popover } from '@/components/ui/popover';
import DisplaySettingsPanel from '@/components/layout/display-settings-panel';

export interface DisplaySettingsPopoverProps {
  /** The rail's round accessibility button (server-rendered); Radix wires it as the trigger. */
  readonly trigger: ReactElement<ComponentProps<'button'>>;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Display settings as a Radix popover above the rail's accessibility button (desktop). Esc and
 * an outside click close it, focus moves in on open and back to the button on close. Loaded on
 * first intent (see DisplaySettings), with floating-ui, so neither is in the first-load bundle.
 */
export default function DisplaySettingsPopover({ trigger, open, onOpenChange }: DisplaySettingsPopoverProps) {
  return (
    <Popover trigger={trigger} label="Display settings" side="top" align="start" open={open} onOpenChange={onOpenChange}>
      <p className="mb-4 text-card-title text-ink">Display settings</p>
      <DisplaySettingsPanel />
    </Popover>
  );
}
