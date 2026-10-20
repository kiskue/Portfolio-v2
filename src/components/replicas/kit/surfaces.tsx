import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { RIconChip } from './controls';
import { RGlyph } from './glyph';
import { padding, px, rStyle } from './tokens';
import type { RBoxProps, RColor, RPad } from './types';

export interface RCardEdge {
  readonly side: 'left' | 'top';
  readonly color: RColor;
  /** 3 or 4 px in the apps. */
  readonly width: number;
}

export interface RCardProps extends RBoxProps {
  /** Corner radius in px (the apps use 8, 12, 14, 16, 20 and 21). */
  readonly radius: number;
  /** faint: 1px hairline (Citizen and Responder) · default: 1px app border · none (default). */
  readonly border?: 'faint' | 'default' | 'none';
  /** Explicit border colour (implies a 1px border). */
  readonly borderColor?: RColor;
  readonly shadow?: 'none' | 'sm' | 'md' | 'lg';
  /** An accent bar along the left or top edge, clipped by the radius. */
  readonly edge?: RCardEdge;
  /** A soft coloured glow instead of the shadow (the SME AI cards). */
  readonly glow?: RColor;
  readonly pad?: RPad;
  readonly bg?: RColor;
  readonly children?: ReactNode;
}

/** KPI, P&L, AI, hazard, info and distance cards. Lays its children out as a column. */
export function RCard({
  radius,
  border = 'none',
  borderColor,
  shadow = 'none',
  edge,
  glow,
  pad,
  bg,
  children,
  className,
  style,
}: RCardProps): ReactNode {
  const borderMode = borderColor !== undefined && border === 'none' ? 'default' : border;
  return (
    <div
      className={cn('rx-card', className)}
      data-border={borderMode}
      data-shadow={glow ? undefined : shadow}
      style={rStyle(
        {},
        {
          borderRadius: px(radius),
          padding: padding(pad),
          background: bg,
          borderColor,
          boxShadow: glow ? `0 4px 12px ${glow}` : undefined,
          ...style,
        },
      )}
    >
      {edge ? (
        <span
          className="rx-card__edge"
          data-side={edge.side}
          style={edge.side === 'left' ? { width: px(edge.width), background: edge.color } : { height: px(edge.width), background: edge.color }}
        />
      ) : null}
      {children}
    </div>
  );
}

export interface RListRowProps extends RBoxProps {
  readonly leading?: ReactNode;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  /** A small meta line (distance, time), e.g. two RText or icon + text spans. */
  readonly meta?: ReactNode;
  /** 'chevron' draws a muted chevron; or pass a node (amount, pill, switch). */
  readonly trailing?: 'chevron' | ReactNode;
  readonly gap?: number;
  readonly pad?: RPad;
}

/** Ledger, hazard, quake, restock and timeline rows. */
export function RListRow({ leading, title, subtitle, meta, trailing, gap, pad, className, style }: RListRowProps): ReactNode {
  return (
    <div
      className={cn('rx-row', className)}
      style={rStyle({}, { gap: gap === undefined ? undefined : px(gap), padding: padding(pad), ...style })}
    >
      {leading ? <span className="rx-row__lead">{leading}</span> : null}
      <span className="rx-row__body">
        <span className="rx-row__title">{title}</span>
        {subtitle ? <span className="rx-row__subtitle">{subtitle}</span> : null}
        {meta ? <span className="rx-row__meta">{meta}</span> : null}
      </span>
      {trailing === undefined || trailing === null ? null : (
        <span className="rx-row__trail">{trailing === 'chevron' ? <RGlyph icon={ChevronRight} size={16} /> : trailing}</span>
      )}
    </div>
  );
}

export interface RKpiTileProps extends RBoxProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  /** Accent for the bar, the icon tile and the value. */
  readonly accent: RColor;
  /**
   * kpi: white radius-12 card, 3px left bar, 28px icon tile beside the label (SME dashboard).
   * stat-tile: radius-24 tile, 34px icon tile above the value and label (StatTile).
   */
  readonly look: 'kpi' | 'stat-tile';
  /** A third line, e.g. "412 orders". */
  readonly sub?: string;
}

export function RKpiTile({ icon, label, value, accent, look, sub, className, style }: RKpiTileProps): ReactNode {
  return (
    <div className={cn('rx-kpi', className)} data-look={look} style={rStyle({ '--rx-kpi-c': accent }, style)}>
      {look === 'kpi' ? (
        <>
          <span className="rx-kpi__head">
            <RIconChip icon={icon} color={accent} size={28} radius={8} shape="square" iconSize={16} />
            <span className="rx-kpi__label">{label}</span>
          </span>
          <span className="rx-kpi__value">{value}</span>
        </>
      ) : (
        <>
          <RIconChip icon={icon} color={accent} size={34} radius={11} shape="square" iconSize={18} />
          <span className="rx-kpi__value">{value}</span>
          <span className="rx-kpi__label">{label}</span>
        </>
      )}
      {sub ? <span className="rx-kpi__sub">{sub}</span> : null}
    </div>
  );
}
