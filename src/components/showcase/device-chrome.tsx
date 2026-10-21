import type { ReactNode } from 'react';

export interface DeviceChromeProps {
  /** Status-bar glyph colour: 'light' glyphs sit on dark headers. */
  readonly statusBar: 'light' | 'dark';
  /** Home-indicator colour: 'dark' on light screens, 'light' on dark ones. */
  readonly homeIndicator: 'light' | 'dark';
}

/*
 * The status-bar glyphs as ONE 73×12 SVG: signal (18 wide), Wi-Fi (16) and battery (27), 6px
 * apart, exactly where three SVGs in a 6px-gap flex row used to sit. Shapes that share a paint
 * share a path, so a phone's chrome is 9 elements instead of 19 (the Home trio draws nine
 * phones: PLAN DOM budget). Path data keeps separators between numbers (content-safety rule).
 */

/** Opaque fills: the four signal bars (rx 1), the Wi-Fi dot and the battery level (rx 1.6). */
const FILLS =
  'M1 8H2A1 1 0 0 1 3 9V11A1 1 0 0 1 2 12H1A1 1 0 0 1 0 11V9A1 1 0 0 1 1 8Z' +
  'M6 5.5H7A1 1 0 0 1 8 6.5V11A1 1 0 0 1 7 12H6A1 1 0 0 1 5 11V6.5A1 1 0 0 1 6 5.5Z' +
  'M11 3H12A1 1 0 0 1 13 4V11A1 1 0 0 1 12 12H11A1 1 0 0 1 10 11V4A1 1 0 0 1 11 3Z' +
  'M16 0.5H17A1 1 0 0 1 18 1.5V11A1 1 0 0 1 17 12H16A1 1 0 0 1 15 11V1.5A1 1 0 0 1 16 0.5Z' +
  'M30.4 10.4a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0Z' +
  'M50.2 2.6H65.8A1.6 1.6 0 0 1 67.4 4.2V7.8A1.6 1.6 0 0 1 65.8 9.4H50.2A1.6 1.6 0 0 1 48.6 7.8V4.2A1.6 1.6 0 0 1 50.2 2.6Z';

/** The two Wi-Fi arcs (1.8px round strokes). */
const ARCS = 'M29.03 8.03A4.2 4.2 0 0 1 34.97 8.03M26.77 5.77A7.4 7.4 0 0 1 37.23 5.77';

/** The battery outline (a 1.2px stroke at 45%) and its cap (a fill at 45%). */
const BATTERY_OUTLINE =
  'M49.95 0.75H66.05A3.2 3.2 0 0 1 69.25 3.95V8.05A3.2 3.2 0 0 1 66.05 11.25H49.95A3.2 3.2 0 0 1 46.75 8.05V3.95A3.2 3.2 0 0 1 49.95 0.75Z';
const BATTERY_CAP = 'M71.4 4H71.4A1 1 0 0 1 72.4 5V7A1 1 0 0 1 71.4 8H71.4A1 1 0 0 1 70.4 7V5A1 1 0 0 1 71.4 4Z';

/**
 * Brand-neutral device chrome drawn over the 390×844 canvas in logical px (design §5.1): a
 * 9:41 status bar with signal, Wi-Fi and battery glyphs, an 11px punch-hole camera (no notch,
 * no Dynamic Island) and a 134×5 home indicator. Decorative: it sits inside the inert canvas.
 * The time is a bare text node: the status row is a flex box, so it lays out exactly as a span.
 */
export function DeviceChrome({ statusBar, homeIndicator }: DeviceChromeProps): ReactNode {
  return (
    <div className="phone-chrome" data-status={statusBar} data-indicator={homeIndicator}>
      <div className="phone-chrome__status">
        9:41
        <svg width="73" height="12" viewBox="0 0 73 12" aria-hidden="true">
          <path d={FILLS} fill="currentColor" />
          <path d={ARCS} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d={BATTERY_OUTLINE} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
          <path d={BATTERY_CAP} fill="currentColor" fillOpacity="0.45" />
        </svg>
      </div>
      <span className="phone-chrome__punch" />
      <span className="phone-chrome__home" />
    </div>
  );
}
