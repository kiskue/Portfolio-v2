import './tools-strip.css';
import type { ReactNode } from 'react';
import { BrandGlyph } from '@/components/ui/brand-glyph';
import { Icon } from '@/components/ui/icon';
import { home } from '@/content/home';
import { site } from '@/content/site';
import { tools } from '@/content/tools';
import type { PlaceholderMode } from '@/content/types';
import { visible } from '@/lib/placeholder';
import { MarqueeRoot } from '@/components/sections/home/marquee-root';

export interface ToolsStripProps {
  readonly className?: string;
  readonly mode?: PlaceholderMode;
}

/**
 * "Daily drivers · Tools I work with" (design §4.2): the evidence-backed tools in a CSS marquee
 * with a visible Pause button. It pauses off-screen, on hover and on focus-within, and is still
 * without JavaScript; under reduced motion it becomes wrapped chips. Only each tool's label and
 * glyph reach the page (its evidence stays build-time data).
 */
export function ToolsStrip({ className, mode = site.placeholders }: ToolsStripProps): ReactNode {
  const shown = visible(tools, mode);
  const titleId = 'tools-title';
  return (
    <MarqueeRoot
      titleId={titleId}
      className={className}
      head={
        <>
          <p className="text-eyebrow text-accent-ink uppercase">{home.tools.eyebrow}</p>
          <h2 id={titleId} className="text-card-title text-ink">
            {home.tools.title}
          </h2>
        </>
      }
      items={shown.map((tool) => (
        <li key={tool.id} className="ts-item">
          <BrandGlyph glyph={tool.glyph} size={18} />
          {tool.label}
        </li>
      ))}
      labels={{
        pause: 'Pause animation',
        play: 'Play animation',
        more: `Show all ${shown.length}`,
        less: 'Show fewer',
      }}
      icons={{ pause: <Icon name="pause" size={16} />, play: <Icon name="play" size={16} /> }}
    />
  );
}
