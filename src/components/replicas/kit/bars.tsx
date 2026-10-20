import { Bell, ChevronLeft, Menu, ShieldCheck, X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { RCountBadge } from './controls';
import { RGlyph } from './glyph';
import { px, rStyle } from './tokens';
import type { RBoxProps, RColor } from './types';

const LEADING_ICONS = { menu: Menu, back: ChevronLeft, close: X } as const;

export interface RAppBarProps extends RBoxProps {
  /**
   * citizen: #f8f9fa bar, menu in the brand primary, muted centred title, logo on the right.
   * responder: #f8f9fa bar, menu and start-aligned title in the brand secondary.
   * sme: navy #1E4D8C band, white glyphs, 18px centred title, bell badge.
   * sheet: a modal sheet header (no status-bar inset).
   */
  readonly look: 'citizen' | 'responder' | 'sme' | 'sheet';
  readonly title?: string;
  readonly subtitle?: string;
  /** Default: start for responder, centre otherwise. */
  readonly align?: 'center' | 'start';
  readonly leading?: 'menu' | 'back' | 'close' | 'none';
  /** Extra controls at the end (e.g. the Responder duty chip). */
  readonly trailing?: ReactNode;
  /**
   * true draws the default mark: a brand tile (Citizen and Responder) or the SME wordmark,
   * which replaces the centred title. Pass a node for an app-specific mark.
   */
  readonly logo?: true | ReactNode;
  /** A bell with this count badge at the end (SME). */
  readonly badge?: number;
  /** Pad the bar under the 44px status bar (default true; false for the sheet look). */
  readonly inset?: boolean;
  readonly titleColor?: RColor;
  readonly titleSize?: number;
  readonly iconColor?: RColor;
  /** Bar background override. */
  readonly bg?: RColor;
}

function DefaultMark({ look }: { readonly look: RAppBarProps['look'] }): ReactNode {
  if (look === 'sme') {
    return (
      <span className="rx-appbar__wordmark">
        <span className="rx-appbar__wordmark-top">SME</span>
        <span className="rx-appbar__wordmark-bottom">PANINDIO</span>
      </span>
    );
  }
  return (
    <span className="rx-appbar__logo">
      <RGlyph icon={ShieldCheck} size={18} />
    </span>
  );
}

/** Every header: the status-bar inset, a leading glyph, the title and the trailing controls. */
export function RAppBar({
  look,
  title,
  subtitle,
  align,
  leading = 'menu',
  trailing,
  logo,
  badge,
  inset,
  titleColor,
  titleSize,
  iconColor,
  bg,
  className,
  style,
}: RAppBarProps): ReactNode {
  const LeadingIcon = leading === 'none' ? null : LEADING_ICONS[leading];
  const mark = logo === undefined || logo === null || logo === false ? null : logo === true ? <DefaultMark look={look} /> : logo;
  const centredMark = look === 'sme' && mark !== null;
  const withInset = inset ?? look !== 'sheet';
  return (
    <div
      className={cn('rx-appbar', className)}
      data-look={look}
      data-align={align ?? (look === 'responder' ? 'start' : 'center')}
      data-inset={withInset ? '' : undefined}
      style={rStyle(
        {
          '--rx-appbar-title': titleColor,
          '--rx-appbar-fs': titleSize === undefined ? undefined : px(titleSize),
          '--rx-appbar-icon': iconColor,
        },
        { background: bg, ...style },
      )}
    >
      <div className="rx-appbar__row">
        <span className="rx-appbar__lead">{LeadingIcon ? <RGlyph icon={LeadingIcon} size={leading === 'back' ? 26 : 24} /> : null}</span>
        <span className="rx-appbar__titles">
          {centredMark ? mark : null}
          {!centredMark && title ? <span className="rx-appbar__title">{title}</span> : null}
          {!centredMark && subtitle ? <span className="rx-appbar__subtitle">{subtitle}</span> : null}
        </span>
        <span className="rx-appbar__trail">
          {trailing}
          {badge === undefined ? null : (
            <span className="rx-appbar__bell">
              <RGlyph icon={Bell} size={24} />
              <RCountBadge count={badge} ring={look === 'sme' ? '#1e4d8c' : undefined} />
            </span>
          )}
          {centredMark ? null : mark}
        </span>
      </div>
    </div>
  );
}

export interface RTabItem {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly active?: true;
  /** Hue override for this item. */
  readonly color?: RColor;
}

export interface RTabBarProps extends RBoxProps {
  /**
   * citizen-floating: the 64px frosted capsule (active tab = tinted pill with its label).
   * sme-glass: the docked 56px glass bar with labels.
   * responder-pill: the floating 3-action pill over the map.
   */
  readonly look: 'citizen-floating' | 'sme-glass' | 'responder-pill';
  readonly items: readonly RTabItem[];
  /** A centre control (the Citizen SOS) centred on the bar's top edge in a 92px slot. */
  readonly center?: ReactNode;
  /** Distance from the canvas bottom in px (defaults: 28, 0 and 40). */
  readonly bottom?: number;
}

/** Bottom navigation. Items split evenly around `center` when one is given. */
export function RTabBar({ look, items, center, bottom, className, style }: RTabBarProps): ReactNode {
  const split = center === undefined ? items.length : Math.ceil(items.length / 2);
  const iconSize = look === 'citizen-floating' ? 24 : look === 'responder-pill' ? 25 : 22;
  const renderItem = (item: RTabItem, index: number): ReactNode => {
    return (
      <span
        key={`${index}-${item.label}`}
        className="rx-tabbar__item"
        data-on={item.active ? '' : undefined}
        style={rStyle({ '--rx-tab-c': item.color })}
      >
        <RGlyph icon={item.icon} size={iconSize} />
        <span className="rx-tabbar__label">{item.label}</span>
      </span>
    );
  };
  return (
    <div
      className={cn('rx-tabbar', className)}
      data-look={look}
      style={rStyle({}, { bottom: bottom === undefined ? undefined : px(bottom), ...style })}
    >
      {items.slice(0, split).map(renderItem)}
      {center === undefined ? null : (
        <span className="rx-tabbar__center">
          <span className="rx-tabbar__center-inner">{center}</span>
        </span>
      )}
      {items.slice(split).map((item, index) => renderItem(item, index + split))}
    </div>
  );
}
