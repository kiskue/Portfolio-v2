import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { RGlyph } from './glyph';
import { padding, px, rStyle } from './tokens';
import type { RBoxProps, RColor, RPad } from './types';

export interface RSheetHandle {
  readonly color?: RColor;
  readonly width?: number;
  readonly height?: number;
}

export interface RBottomSheetProps extends RBoxProps {
  /** Sheet height: a share of the canvas ("50%") or px. */
  readonly height: `${number}%` | number;
  /** Top corner radius in px (default 22). */
  readonly radius?: number;
  /** A grab handle (default 40×5, #cbd5e1). */
  readonly handle?: boolean | RSheetHandle;
  readonly header?: ReactNode;
  /** Pinned to the bottom of the sheet. */
  readonly footer?: ReactNode;
  /** A scrim over the screen behind: true for the app's scrim, or any CSS colour. */
  readonly scrim?: boolean | RColor;
  readonly bg?: RColor;
  readonly children?: ReactNode;
}

/** A bottom sheet over the screen (checkout, dispatch, chat). Covers the canvas as an overlay layer. */
export function RBottomSheet({ height, radius, handle, header, footer, scrim, bg, children, className, style }: RBottomSheetProps): ReactNode {
  const handleStyle = typeof handle === 'object' ? handle : undefined;
  return (
    <div className="rx-sheet-layer">
      {scrim ? (
        <span className="rx-sheet-layer__scrim" style={typeof scrim === 'string' ? { background: scrim } : undefined} />
      ) : null}
      <div
        className={cn('rx-sheet', className)}
        style={rStyle(
          {},
          {
            height: typeof height === 'number' ? px(height) : height,
            borderRadius: radius === undefined ? undefined : `${px(radius)} ${px(radius)} 0 0`,
            background: bg,
            ...style,
          },
        )}
      >
        {handle ? (
          <span
            className="rx-sheet__handle"
            style={rStyle(
              {},
              {
                background: handleStyle?.color,
                width: handleStyle?.width === undefined ? undefined : px(handleStyle.width),
                height: handleStyle?.height === undefined ? undefined : px(handleStyle.height),
              },
            )}
          />
        ) : null}
        {header ? <div className="rx-sheet__header">{header}</div> : null}
        <div className="rx-sheet__body">{children}</div>
        {footer ? <div className="rx-sheet__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export interface RModalCardProps extends RBoxProps {
  readonly children?: ReactNode;
  /** Scrim colour (default the app's scrim). */
  readonly scrim?: RColor;
  /** Backdrop blur in px (default 6). */
  readonly blur?: number;
  /** Card width: px or a share of the screen (default "92%"). */
  readonly width?: number | `${number}%`;
  /** Corner radius in px (default 21). */
  readonly radius?: number;
  /** Padding in px (default 28). */
  readonly pad?: RPad;
  readonly bg?: RColor;
}

/** A centred card over a blurred scrim (the SOS confirmation). */
export function RModalCard({ children, scrim, blur, width, radius, pad, bg, className, style }: RModalCardProps): ReactNode {
  return (
    <div
      className="rx-modal"
      style={rStyle({}, { background: scrim, backdropFilter: blur === undefined ? undefined : `blur(${px(blur)})` })}
    >
      <div
        className={cn('rx-modal__card', className)}
        style={rStyle(
          {},
          {
            width: typeof width === 'number' ? px(width) : width,
            borderRadius: radius === undefined ? undefined : px(radius),
            padding: padding(pad),
            background: bg,
            ...style,
          },
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface RToastProps extends RBoxProps {
  readonly text: string;
  readonly icon?: LucideIcon;
  /** Glyph colour (default #1e90ff). */
  readonly iconColor?: RColor;
  /** Distance from the canvas top in px (default 52, under the status bar). */
  readonly top?: number;
}

/** A top toast ("New ticket assigned — opening the map."). */
export function RToast({ text, icon, iconColor, top, className, style }: RToastProps): ReactNode {
  return (
    <div className={cn('rx-toast', className)} style={rStyle({}, { top: top === undefined ? undefined : px(top), ...style })}>
      {icon ? (
        <span className="rx-toast__icon" style={rStyle({}, { color: iconColor })}>
          <RGlyph icon={icon} size={24} />
        </span>
      ) : null}
      <span>{text}</span>
    </div>
  );
}
