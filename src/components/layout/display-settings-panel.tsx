'use client';

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { cardVariants } from '@/components/ui/card';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import type { MotionPref, ThemePref } from '@/lib/display-settings';
import { getDisplaySnapshot, getServerDisplaySnapshot, setDisplay, subscribeDisplay } from '@/lib/display-store';
import { cn } from '@/lib/cn';

const THEME_OPTIONS: readonly SegmentedOption<ThemePref>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const MOTION_OPTIONS: readonly SegmentedOption<MotionPref>[] = [
  { value: 'system', label: 'System' },
  { value: 'reduce', label: 'Reduce' },
];

export interface DisplaySettingsPanelProps {
  /** Draw its own raised card (the inline disclosure); the popover supplies the surface instead. */
  readonly framed?: boolean;
}

/**
 * The two display settings (PLAN: Theme and Motion; deliberately no text size), as native-radio
 * segmented controls bound to the display store: a choice applies at once, persists, and is
 * painted before first paint on the next load. Loaded on demand with the popover or disclosure.
 */
export default function DisplaySettingsPanel({ framed = false }: DisplaySettingsPanelProps) {
  // Radio names must be unique on the page: the footer and the sheet can both hold a panel.
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const { prefs } = useSyncExternalStore(subscribeDisplay, getDisplaySnapshot, getServerDisplaySnapshot);
  const hint = `${id}-motion-hint`;

  // The inline panel opens at the bottom of the sheet or the page: bring it into view.
  useEffect(() => {
    if (framed) root.current?.scrollIntoView({ block: 'nearest' });
  }, [framed]);

  return (
    <div
      ref={root}
      className={cn(
        'flex flex-col gap-4',
        framed && cardVariants({ surface: 'raised', radius: 'card', pad: 'none', elevation: 'flat' }),
        framed && 'p-4',
      )}
    >
      <SegmentedControl
        name={`${id}-theme`}
        legend="Theme"
        options={THEME_OPTIONS}
        value={prefs.theme}
        onValueChange={(theme) => setDisplay({ theme })}
        size="sm"
      />
      <div>
        <SegmentedControl
          name={`${id}-motion`}
          legend="Motion"
          options={MOTION_OPTIONS}
          value={prefs.motion}
          onValueChange={(motion) => setDisplay({ motion })}
          size="sm"
          describedBy={hint}
        />
        <p id={hint} className="mt-2 text-meta text-ink-3">
          Reduce stops autoplay and movement. System follows your device.
        </p>
      </div>
    </div>
  );
}
