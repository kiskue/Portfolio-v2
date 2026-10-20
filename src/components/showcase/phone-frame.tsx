import Image from 'next/image';
import type { ReactNode } from 'react';
import { DeviceChrome } from '@/components/showcase/device-chrome';
import type { ScreenImage } from '@/content/types';
import { cn } from '@/lib/cn';

/*
 * The one phone frame (architecture D4, design §5.1). Hook-free and free of server-only
 * imports, so client islands (the lightbox) can render it too. Sizes come from CSS alone
 * (src/styles/replica.css), so a phone never shifts layout.
 */

export const PHONE_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
export type PhoneSize = (typeof PHONE_SIZES)[number];

/** --ps per size. The outer box is 414×868 × --ps; the screen 390×844 × --ps. */
export const PHONE_SCALE: Readonly<Record<PhoneSize, number>> = {
  xs: 0.2899,
  sm: 0.3768,
  md: 0.5024,
  lg: 0.6377,
  xl: 0.8696,
  '2xl': 1.0145,
};

/** next/image `sizes` for an image of `logicalWidth` px at a phone size ('inherit' assumes 2xl). */
function imageSizes(size: PhoneSize | 'inherit', logicalWidth: number): string {
  return `${Math.ceil(logicalWidth * PHONE_SCALE[size === 'inherit' ? '2xl' : size])}px`;
}

interface PhoneBase {
  /** A fixed size, or 'inherit' to take --ps from an ancestor (e.g. a container query). */
  readonly size: PhoneSize | 'inherit';
  /** What the screen shows, as the frame's role="img" label (a figure summary or the image alt). */
  readonly label: string;
  readonly className?: string;
}

export type PhoneFrameProps =
  | (PhoneBase & {
      /** Draws the 9:41 status bar, the punch-hole camera and the home indicator over the canvas. */
      readonly chrome: 'device';
      /** Status-bar glyph colour: 'light' glyphs sit on dark headers. */
      readonly statusBar: 'light' | 'dark';
      /** Home-indicator colour (default 'dark', for light screens). */
      readonly homeIndicator?: 'light' | 'dark';
      /** The 390×844 canvas content (RCanvas and a replica). */
      readonly children: ReactNode;
      readonly image?: never;
    })
  | (PhoneBase & {
      readonly chrome: 'none';
      readonly children: ReactNode;
      readonly image?: never;
      readonly statusBar?: never;
      readonly homeIndicator?: never;
    })
  | (PhoneBase & {
      readonly chrome: 'none';
      /** A real screenshot shown raw inside the screen. Marketing images never go in a frame. */
      readonly image: ScreenImage & { readonly presentation: 'raw' };
      readonly children?: never;
      readonly statusBar?: never;
      readonly homeIndicator?: never;
    });

/**
 * A brand-neutral phone: role="img" with `label`; the screen inside is inert and aria-hidden,
 * and a replica canvas is marked data-replica-canvas (axe skips colour contrast only there).
 */
export function PhoneFrame(props: PhoneFrameProps): ReactNode {
  const { size, label, className } = props;
  const image = props.image;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('phone', className)}
      data-phone=""
      data-size={size}
      data-chrome={props.chrome}
    >
      <div className="phone-screen" aria-hidden="true" inert data-replica-canvas={image ? undefined : ''}>
        {image ? (
          <Image
            src={image.src}
            alt=""
            fill
            sizes={imageSizes(size, 390)}
            loading="lazy"
            className="object-cover object-top"
          />
        ) : (
          <div className="phone-canvas">
            {props.children}
            {props.chrome === 'device' ? (
              <DeviceChrome statusBar={props.statusBar} homeIndicator={props.homeIndicator ?? 'dark'} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export interface ScreenCardProps {
  /** A marketing screenshot (frame or text baked in): shown at its own aspect ratio. */
  readonly image: ScreenImage;
  /** The card is as wide as a phone of this size. */
  readonly size: PhoneSize | 'inherit';
  readonly className?: string;
}

/** A bordered radius-16 card for marketing screenshots, so they are never double-framed. */
export function ScreenCard({ image, size, className }: ScreenCardProps): ReactNode {
  return (
    <div
      className={cn('screen-card', className)}
      data-size={size}
      data-presentation={image.presentation}
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      <Image src={image.src} alt={image.alt} fill sizes={imageSizes(size, 414)} loading="lazy" className="object-cover" />
    </div>
  );
}
