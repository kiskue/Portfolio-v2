import type { IconName } from '@/content/types';
import { ICONS } from '@/components/ui/icon-registry';
import { cn } from '@/lib/cn';
import { renderLucideSvg } from '@/lib/lucide-node';

export type IconSize = 12 | 14 | 16 | 18 | 20 | 24 | 28 | 32 | 36;

export interface IconProps {
  readonly name: IconName;
  /** Rendered size in px (design §3.5: 16 / 18 / 20 / 24; larger for medallions). */
  readonly size?: IconSize;
  /**
   * Accessible name. Omit it for decorative icons (the default): they are aria-hidden and the
   * surrounding text carries the meaning. With a label the icon is role="img".
   */
  readonly label?: string;
  readonly strokeWidth?: number;
  readonly className?: string;
}

/**
 * A lucide icon by registry key; monochrome currentColor, stroke 1.75 (design §3.5).
 *
 * Drawn as plain SVG by src/lib/lucide-node.ts, with exactly lucide-react's markup: from a
 * Server Component it is static HTML (not a lucide client component that hydrates and carries
 * its icon data in the RSC payload), and it renders the same way inside client islands.
 */
export function Icon({ name, size = 20, label, strokeWidth = 1.75, className }: IconProps) {
  const classes = cn('shrink-0', className);
  if (label) return renderLucideSvg(ICONS[name], { size, strokeWidth, role: 'img', 'aria-label': label, className: classes });
  return renderLucideSvg(ICONS[name], { size, strokeWidth, 'aria-hidden': 'true', className: classes });
}
