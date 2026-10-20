import type { IconName } from '@/content/types';
import { Icon, type IconSize } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

export type IconTileSize = 20 | 24 | 28 | 32;
export type IconTileTone = 'solid' | 'soft';

export interface IconTileProps {
  readonly icon: IconName;
  /** solid: accent fill with the WHITE on-accent glyph (template look); soft: tinted fill. */
  readonly tone?: IconTileTone;
  readonly size?: IconTileSize;
  readonly className?: string;
}

const TILE_SIZE: Record<IconTileSize, string> = {
  20: 'size-5 rounded-[6px]',
  24: 'size-6 rounded-[7px]',
  28: 'size-7 rounded-tile',
  32: 'size-8 rounded-tile',
};

const GLYPH_SIZE: Record<IconTileSize, IconSize> = { 20: 12, 24: 14, 28: 16, 32: 18 };

const TONE: Record<IconTileTone, string> = {
  solid: 'bg-accent text-on-accent',
  soft: 'bg-accent-soft text-soft-ink',
};

/**
 * The one icon tile (reuse rule 2). Always decorative: the title next to it carries the meaning,
 * so the white glyph on orange is exempt from 1.4.11 (PLAN amendment). The transparent border
 * shows as a visible outline in forced-colors mode (design §10).
 */
export function IconTile({ icon, tone = 'solid', size = 28, className }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-transparent',
        TILE_SIZE[size],
        TONE[tone],
        className,
      )}
    >
      <Icon name={icon} size={GLYPH_SIZE[size]} strokeWidth={size >= 28 ? 2 : 1.75} />
    </span>
  );
}
