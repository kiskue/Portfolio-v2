import { CircleCheckBig, Sparkles, TrendingUp, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RSpinner, RStateSequence } from '@/components/replicas/kit';
import type { SmeRisk } from '@/components/replicas/sme/sample-data';
import { AI_COPY } from './ai-copy';
import { ENHANCE_TIMING } from './enhance-timing';

/*
 * The small pills of AIInsightCard: the label pill on the left (Bot / FileText), and on the
 * right the "Enhance with AI" control and the risk badge.
 */

export interface LabelPillProps {
  readonly icon: LucideIcon;
  readonly label: string;
}

/** Radius 20, 5 × 10 padding, 16 px glyph and 12 px semibold label in the AI accent on its 15% tint. */
export function LabelPill({ icon, label }: LabelPillProps): ReactNode {
  return (
    <span className="rx-sme-ai-label">
      <RGlyph icon={icon} size={16} />
      <span>{label}</span>
    </span>
  );
}

/** idle: Sparkles + "Enhance with AI" · loading: spinner + "Enhancing…" at 70% · done: Sparkles + "AI-generated". */
export type EnhanceLook = 'idle' | 'loading' | 'done';

const ENHANCE_LABEL: Readonly<Record<EnhanceLook, string>> = {
  idle: AI_COPY.enhance,
  loading: AI_COPY.enhancing,
  done: AI_COPY.enhanced,
};

/** The enhance control: radius 20, 4 × 8 padding, the AI accent at 10%; Android's 20 px ActivityIndicator while loading. */
export function EnhancePill({ look }: { readonly look: EnhanceLook }): ReactNode {
  return (
    <span className="rx-sme-ai-enhance" data-state={look}>
      {look === 'loading' ? (
        <span className="rx-sme-ai-enhance__spin">
          <RSpinner size={16} thickness={2} />
        </span>
      ) : (
        <RGlyph icon={Sparkles} size={11} />
      )}
      <span>{ENHANCE_LABEL[look]}</span>
    </span>
  );
}

/**
 * The enhance control through the 1.6 glimpse: idle, then "Enhancing…", then "AI-generated"
 * (ENHANCE_TIMING). The idle pill is the poster; the frames share one right-aligned cell.
 */
export function EnhanceSequence(): ReactNode {
  return (
    <RStateSequence
      className="rx-sme-ai-enhance-seq"
      fadeMs={ENHANCE_TIMING.pillFadeMs}
      frames={[
        { atMs: 0, node: <EnhancePill look="idle" /> },
        { atMs: ENHANCE_TIMING.enhancingAtMs, node: <EnhancePill look="loading" /> },
        { atMs: ENHANCE_TIMING.arrivedAtMs, node: <EnhancePill look="done" /> },
      ]}
    />
  );
}

const RISK: Readonly<Record<SmeRisk, { readonly icon: LucideIcon; readonly label: string }>> = {
  low: { icon: CircleCheckBig, label: 'Low Risk' },
  medium: { icon: TrendingUp, label: 'Medium Risk' },
  high: { icon: TriangleAlert, label: 'High Risk' },
};

/** The rule-based risk badge: radius 20, 4 × 8 padding, 11 px glyph and 12 px semibold label in the risk colours. */
export function RiskBadge({ risk }: { readonly risk: SmeRisk }): ReactNode {
  const { icon, label } = RISK[risk];
  return (
    <span className="rx-sme-ai-risk" data-risk={risk}>
      <RGlyph icon={icon} size={11} />
      <span>{label}</span>
    </span>
  );
}
