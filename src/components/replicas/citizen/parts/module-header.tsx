import { CircleArrowRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';

export interface ModuleHeaderProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly subtitle: string;
  /** The pill label at the right ("View More", "Open"). */
  readonly action: string;
  /**
   * module (default): the orange module accent, #F97316 on #FFEDD5 (Today's Report, Earthquake
   * Monitor, News Headline). glass: a white glyph on white at 20% (Online Services).
   */
  readonly tone?: 'module' | 'glass';
}

/**
 * The Home section band (ModuleHeader.tsx): a full-width diagonal gradient from the brand
 * primary to the brand secondary, a 38 px icon circle, a bold white title over a 60% white
 * subtitle, and an action pill on white at 64% whose label and arrow take the brand primary.
 */
export function ModuleHeader({ icon, title, subtitle, action, tone = 'module' }: ModuleHeaderProps): ReactNode {
  return (
    <div className="rx-citizen-module">
      <span className="rx-citizen-module__icon" data-tone={tone}>
        <RGlyph icon={icon} size={24} />
      </span>
      <span className="rx-citizen-module__titles">
        <span className="rx-citizen-module__title">{title}</span>
        <span className="rx-citizen-module__subtitle">{subtitle}</span>
      </span>
      <span className="rx-citizen-module__action">
        {action}
        <RGlyph icon={CircleArrowRight} size={16} />
      </span>
    </div>
  );
}
