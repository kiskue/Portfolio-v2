'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useShowcaseActions, useShowcaseView, type LightboxEntry } from '@/components/sections/showcase/showcase-provider';
import { useOptionalBrand } from '@/components/showcase/brand-scope';
import { stretchedLinkClass } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/cn';

/*
 * One tile of the Showcase wall (design §7): a <figure> with a static sm phone (or a frameless
 * store card) and a caption whose title is the button that opens the lightbox. The button's
 * ::after covers the whole tile, so the phone, title and chips are one target; the focus ring is
 * drawn around the tile.
 *
 * The screen arrives server-rendered (ScreenView) and is passed exactly once: the tile draws it
 * here and registers it for the lightbox, which draws the same element again. A replica's box
 * skips rendering while far off screen (content-visibility, design §7); its clip margin keeps the
 * phone's shadow visible.
 *
 * No Suspense boundary wraps the screen: React streams a completed boundary of more than 500
 * bytes out of place once 12.8 KB of the page is out (a template plus a hidden copy that a script
 * swaps in), so without JavaScript the phones would never appear.
 */

export interface WallTileProps {
  readonly id: string;
  /** The caption title (server-rendered), e.g. "FIG 2.3 SOS countdown"; also the button's name. */
  readonly label: ReactNode;
  /** Static chips under the title (server-rendered): the source tag, a listing's brand, a rollout state. */
  readonly chips?: ReactNode;
  /** Adds the surrounding BrandScope's selected brand as a chip (brandable replicas). */
  readonly brandChip?: boolean;
  /** The wall screen: a replica at size 'inherit' (--ps from this tile) or a screenshot at sm. */
  readonly screen: ReactNode;
  /**
   * Skip rendering the screen while it is far off screen (content-visibility: auto, design §7).
   * For replicas, whose markup is heavy; store cards are one lazy image and stay as they are.
   */
  readonly skipOffscreen?: boolean;
  /** What the lightbox shows when it differs from `screen` (a screenshot at size 'inherit'). */
  readonly large?: ReactNode;
  /** The screen's outer height / width at --ps 1 (lightbox fitting). */
  readonly ratio: number;
  /** The lightbox title. */
  readonly title: string;
  /** The lightbox details panel (server-rendered). */
  readonly details: ReactNode;
  readonly caseStudy: LightboxEntry['caseStudy'];
}

export function WallTile({
  id,
  label,
  chips,
  brandChip = false,
  screen,
  skipOffscreen = false,
  large,
  ratio,
  title,
  details,
  caseStudy,
}: WallTileProps): ReactNode {
  const { visibleIds } = useShowcaseView();
  const { register, open, preload } = useShowcaseActions();
  const scope = useOptionalBrand();
  const option = brandChip ? scope?.option : undefined;
  const buttonRef = useRef<HTMLButtonElement>(null);

  const entry = useMemo<LightboxEntry>(
    () => ({
      id,
      title,
      screen: large ?? screen,
      ratio,
      details,
      caseStudy,
      brand: option ? { name: option.name, vars: option.vars } : null,
      focus: () => buttonRef.current?.focus(),
    }),
    [id, title, large, screen, ratio, details, caseStudy, option],
  );

  // Registered for stepping from other screens. Opening passes the entry itself, so a click that
  // React replays while hydrating this tile (before its effects run) still opens the lightbox.
  useEffect(() => register(entry), [register, entry]);

  return (
    <li
      hidden={!visibleIds.has(id)}
      data-showcase-tile={id}
      className={cn(
        'group/tile relative flex w-[9.75rem] flex-col rounded-control',
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-focus',
      )}
    >
      <figure className="flex flex-col gap-3">
        <div
          className={cn(
            '[--ps:0.3768]',
            skipOffscreen &&
              '[content-visibility:auto] [contain-intrinsic-size:auto_156px_auto_327px] [overflow-clip-margin:3rem]',
            'transition-[translate] duration-(--dur-2) ease-out group-hover/tile:-translate-y-1 reduce-motion:group-hover/tile:translate-none',
          )}
          data-tile-screen=""
        >
          {screen}
        </div>
        <figcaption className="flex flex-col gap-2">
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="dialog"
            className={cn(
              stretchedLinkClass,
              'cursor-pointer text-start text-body-sm font-semibold text-ink transition-colors duration-(--dur-1) group-hover/tile:text-accent-ink',
            )}
            onClick={() => open(entry)}
            onPointerEnter={preload}
            onFocus={preload}
            onTouchStart={preload}
          >
            {label}
          </button>
          {chips || option ? (
            <p className="flex flex-wrap gap-1.5">
              {chips}
              {option ? (
                <Chip size="sm" data-tile-brand="">
                  {option.name}
                </Chip>
              ) : null}
            </p>
          ) : null}
        </figcaption>
      </figure>
    </li>
  );
}
