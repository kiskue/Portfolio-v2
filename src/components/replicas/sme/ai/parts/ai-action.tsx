import { Sparkles } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { RButton } from '@/components/replicas/kit';

export interface AiActionProps {
  readonly label: string;
  /** 14 px vertical padding in the hub (49.6 px tall); Business ROI's button has 12 px (45.6 px). */
  readonly pad?: 12 | 14;
  /** Margins and other placement from the screen. */
  readonly style?: CSSProperties;
}

/**
 * The AI action button (Generate report, Get AI advice, Explain forecast, Ask AI about this):
 * full width, radius 12, a 1 px accent border on the deep-blue fill, a 16 px Sparkles in the
 * accent and a 14 px semibold label. A drawn button: RButton renders a div.
 */
export function AiAction({ label, pad = 14, style }: AiActionProps): ReactNode {
  return (
    <RButton
      look="soft"
      label={label}
      icon={Sparkles}
      iconSize={16}
      fontSize={14}
      h={pad * 2 + 19.6 + 2}
      radius={12}
      borderColor="var(--rx-sme-ai-cta-border)"
      textColor="var(--rx-sme-ai-cta-ink)"
      className="rx-sme-ai-cta"
      style={{ background: 'var(--rx-sme-ai-cta-bg)', ...style }}
    />
  );
}
