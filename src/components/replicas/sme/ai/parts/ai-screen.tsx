import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RAppBar, RIconChip, type RColor } from '@/components/replicas/kit';
import { SME_OWNER_NOTIFICATIONS } from '@/components/replicas/sme/sample-data';

export interface AiScreenProps {
  /** The centred TopNavBar title. Omit it and pass `logo` for screens the app's header map leaves untitled. */
  readonly title?: string;
  /** The centred SME wordmark (Business ROI has no header title, so the app shows its BrandLogo). */
  readonly logo?: ReactNode;
  /** A layer over the whole screen, e.g. the chat sheet and its scrim. */
  readonly overlay?: ReactNode;
  /** The visible slice of the screen's scroll content, top first. */
  readonly children?: ReactNode;
}

/**
 * An owner screen in the AI family: the navy TopNavBar (menu, title or wordmark, bell with the
 * owner's unread count) over the dark AI canvas, whose scroll content starts 16 px from the top
 * with 16 px gutters (ai.tsx `scroll`). The content is clipped at the canvas bottom like a list
 * that continues past the fold; the device chrome draws the home indicator over it.
 */
export function AiScreen({ title, logo, overlay, children }: AiScreenProps): ReactNode {
  return (
    <div className="rx-sme-ai-screen">
      <RAppBar look="sme" title={title} logo={logo} badge={SME_OWNER_NOTIFICATIONS} />
      <div className="rx-sme-ai-scroll">{children}</div>
      {overlay}
    </div>
  );
}

export interface SectionTitleProps {
  /** The first section of the visible slice: no 28 px gap above it. */
  readonly first?: boolean;
  readonly children: ReactNode;
}

/** The hub's SectionHeader: 16 px bold, 28 px above and 10 px below (ai.tsx sectionHeader). */
export function SectionTitle({ first, children }: SectionTitleProps): ReactNode {
  return (
    <span className="rx-sme-ai-title" data-first={first ? '' : undefined}>
      {children}
    </span>
  );
}

export interface RoiSectionTitleProps {
  readonly icon: LucideIcon;
  /** Icon and tile hue (the tile is this colour at 10%). */
  readonly color: RColor;
  readonly children: ReactNode;
}

/** Business ROI's local section header: a 28 px tinted tile with a 15 px glyph, then 16 px semibold text. */
export function RoiSectionTitle({ icon, color, children }: RoiSectionTitleProps): ReactNode {
  return (
    <span className="rx-sme-ai-roi-title">
      <RIconChip icon={icon} color={color} size={28} radius={8} shape="square" iconSize={15} />
      <span>{children}</span>
    </span>
  );
}
