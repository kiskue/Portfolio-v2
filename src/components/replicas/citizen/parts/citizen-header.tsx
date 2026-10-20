import type { ReactNode } from 'react';
import { RAppBar, rBrand } from '@/components/replicas/kit';
import { BrandMark } from './brand-mark';

export interface CitizenHeaderProps {
  readonly title: string;
  /**
   * drawer: a tab screen (hamburger in the brand primary, muted title, brand logo at the right).
   * stack: a pushed or modal screen (back chevron and title in the brand primary, no logo).
   */
  readonly kind: 'drawer' | 'stack';
  /** Title size in px: Home 10, Hazards 12, Create Report 14, Hazard Report 16. */
  readonly titleSize: number;
}

/** The native-stack header every Citizen screen sits under: #f8f9fa, 44px status bar inset. */
export function CitizenHeader({ title, kind, titleSize }: CitizenHeaderProps): ReactNode {
  return kind === 'drawer' ? (
    <RAppBar look="citizen" title={title} titleSize={titleSize} logo={<BrandMark />} className="rx-citizen-header" />
  ) : (
    <RAppBar
      look="citizen"
      title={title}
      titleSize={titleSize}
      leading="back"
      titleColor={rBrand.primary}
      className="rx-citizen-header"
    />
  );
}
