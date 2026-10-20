import Image from 'next/image';
import portrait from '@/assets/portrait/gerric-portrait.jpg';
import { cn } from '@/lib/cn';

export type AvatarSize = 36 | 80 | 104;

const SIZE: Record<AvatarSize, string> = {
  36: 'size-9',
  80: 'size-20',
  104: 'size-26',
};

export interface AvatarProps {
  /** Displayed diameter in px: 104 in the rail, 80 on short screens, 36 in the top bar. */
  readonly size: AvatarSize;
  /**
   * The rail's peach glow (design §3.4): a radial gradient centred 60% down, fading to
   * transparent at 70%. It scales with the portrait (230%: the specified 180px around the 80px
   * portrait, 240px around the 104px one), and the colour holds to 25%, so the halo spreads
   * 20–30px past the edge as in the template, strongest below and beside the portrait.
   */
  readonly glow?: true;
  readonly className?: string;
}

/**
 * The portrait in a circle with a 3px surface ring (design §4.1).
 *
 * - Decorative: alt="" because the name always sits next to it.
 * - Eager but never preloaded, so the page H1 stays the LCP element. React 19's server renderer
 *   preloads up to ten non-lazy images in <head> by itself; fetchPriority="low" opts out of
 *   that and keeps the portrait from competing with the CSS and fonts the H1 needs.
 * - Every size requests the same 104px image (1x/2x), so the rail, the top bar and the menu
 *   sheet share one download.
 */
export function Avatar({ size, glow, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0 rounded-full', SIZE[size], className)}>
      {glow ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[60%] left-1/2 size-[230%] -translate-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(var(--peach)/var(--peach-alpha))_25%,transparent_70%)]"
        />
      ) : null}
      <Image
        src={portrait}
        alt=""
        width={104}
        height={104}
        loading="eager"
        fetchPriority="low"
        className="relative size-full rounded-full bg-sunken object-cover object-[52%_30%] ring-3 ring-surface"
      />
    </span>
  );
}
