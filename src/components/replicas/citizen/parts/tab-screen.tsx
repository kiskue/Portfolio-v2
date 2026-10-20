import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { CzTab } from '@/components/replicas/citizen/sample-data';
import { CitizenHeader } from './citizen-header';
import { CitizenTabBar } from './citizen-tab-bar';
import type { SosButtonProps } from './sos-button';

export interface TabScreenProps {
  readonly title: string;
  readonly titleSize: number;
  readonly tab: CzTab;
  readonly sos?: SosButtonProps['state'];
  /** A strip under the header (the offline banner). */
  readonly banner?: ReactNode;
  /** The screen body; give it the rx-citizen-fill class (or an RAutoScroll with it) to take the rest. */
  readonly children: ReactNode;
  /** Layers above the tab bar (the SOS confirmation). */
  readonly overlay?: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * A screen inside the Citizen tab navigator: the drawer header, an optional banner, the body
 * on the #f2f5f9 canvas, the floating tab bar with SOS, and any overlay on top.
 */
export function TabScreen({ title, titleSize, tab, sos, banner, children, overlay, className, style }: TabScreenProps): ReactNode {
  return (
    <div className={cn('rx-citizen-screen', className)} style={style}>
      <CitizenHeader kind="drawer" title={title} titleSize={titleSize} />
      {banner}
      {children}
      <CitizenTabBar active={tab} sos={sos} />
      {overlay}
    </div>
  );
}
