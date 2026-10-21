import { CircleAlert, Folder, House, Puzzle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { R_CANVAS, RTabBar, type RTabItem } from '@/components/replicas/kit';
import { czTabs, type CzTab } from '@/components/replicas/citizen/sample-data';
import { SosButton, type SosButtonProps } from './sos-button';

/** Lucide stand-ins for the app's 25 px tab silhouettes (tabMeta.ts): house, folder, circle-alert, puzzle. */
const TAB_GLYPHS: Readonly<Record<CzTab, LucideIcon>> = {
  Home: House,
  Hotlines: Folder,
  Hazards: CircleAlert,
  Reports: Puzzle,
};

/** The app's BAR_MARGIN_BOTTOM (tabBarTokens.ts): the capsule's gap above the bottom safe area. */
const BAR_MARGIN_BOTTOM = 12;

/**
 * The bar's distance from the canvas bottom: 46 px. The app keeps BAR_MARGIN_BOTTOM a flat 12
 * because AppProviders' SafeAreaView already consumes the bottom inset (the 34 px home-indicator
 * zone here), so the capsule spans 734–798 and the SOS centre sits on its top edge at y 734.
 */
export const CZ_TAB_BAR_BOTTOM = R_CANVAS.homeIndicator + BAR_MARGIN_BOTTOM;

export interface CitizenTabBarProps {
  readonly active: CzTab;
  readonly sos?: SosButtonProps['state'];
}

/**
 * The floating frosted capsule with the SOS docked in its 92 px centre slot. The kit's
 * citizen-floating bar is re-laid out by citizen.css to the shipped geometry: four equal cells,
 * each an icon band over an 11 px label that only the active tab shows, and one 52 px pill
 * (radius 20, accent at 10% with a 45% ring) behind the active cell's icon and label.
 */
export function CitizenTabBar({ active, sos = 'idle' }: CitizenTabBarProps): ReactNode {
  const items: readonly RTabItem[] = czTabs.map((label) =>
    label === active ? { icon: TAB_GLYPHS[label], label, active: true } : { icon: TAB_GLYPHS[label], label },
  );
  return (
    <RTabBar
      look="citizen-floating"
      items={items}
      center={<SosButton state={sos} />}
      bottom={CZ_TAB_BAR_BOTTOM}
      className="rx-citizen-tabbar"
    />
  );
}
