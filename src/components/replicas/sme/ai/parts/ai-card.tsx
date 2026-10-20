import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { RCard, type RColor, type RPad } from '@/components/replicas/kit';
import { LabelPill } from './ai-pills';

export interface AiSurfaceProps {
  /** The soft 0 4px 12px glow (default the AI glow). */
  readonly glow?: RColor;
  readonly pad?: RPad;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * The AI screens' card surface (AIInsightCard, the report, the restock list and the chart card):
 * radius 16, a 1 px border on the card fill and a soft glow. A column, clipped to its corners.
 */
export function AiSurface({ glow, pad, children, className, style }: AiSurfaceProps): ReactNode {
  return (
    <RCard
      radius={16}
      borderColor="var(--rx-sme-ai-border)"
      bg="var(--rx-sme-ai-card)"
      glow={glow ?? 'var(--rx-sme-ai-glow)'}
      pad={pad}
      className={className}
      style={style}
    >
      {children}
    </RCard>
  );
}

export interface AiCardProps {
  /** The label pill's text, e.g. "Business Insight". */
  readonly label: string;
  /** The label pill's glyph (Bot, or FileText on the report). */
  readonly icon: LucideIcon;
  /** The right end of the top row: the enhance control and/or the risk badge. */
  readonly right?: ReactNode;
  /** The 3 px accent bar (default the AI accent; the risk colour on Business ROI). */
  readonly accent?: RColor;
  /** The glow (default the AI glow; the risk glow on Business ROI). */
  readonly glow?: RColor;
  /** insight: 14/22 text, 16 px below, 60 px minimum · report: markdown, 4 px below, 56 px minimum. */
  readonly look?: 'insight' | 'report';
  /** The body: an insight sentence, a typewriter swap, the report bullets or its idle hint. */
  readonly children?: ReactNode;
  /** Inside the card under the body (the report's Generate report button). */
  readonly footer?: ReactNode;
  readonly style?: CSSProperties;
}

/**
 * The AIInsightCard shell, shared by the hub's insight, report, restock and forecast cards and
 * Business ROI: the top row (16 px padding, 8 px below), the accent bar (inset 16, 12 px below)
 * and the body, on an AiSurface. 4 px below it in the hub.
 */
export function AiCard({ label, icon, right, accent, glow, look = 'insight', children, footer, style }: AiCardProps): ReactNode {
  return (
    <AiSurface glow={glow} className="rx-sme-ai-card" style={style}>
      <span className="rx-sme-ai-card__top">
        <LabelPill icon={icon} label={label} />
        {right ? <span className="rx-sme-ai-card__right">{right}</span> : null}
      </span>
      <span className="rx-sme-ai-card__bar" style={accent ? { background: accent } : undefined} />
      <span className="rx-sme-ai-card__body" data-look={look}>
        {children}
      </span>
      {footer}
    </AiSurface>
  );
}
