import type { ReactNode } from 'react';

export interface DeviceChromeProps {
  /** Status-bar glyph colour: 'light' glyphs sit on dark headers. */
  readonly statusBar: 'light' | 'dark';
  /** Home-indicator colour: 'dark' on light screens, 'light' on dark ones. */
  readonly homeIndicator: 'light' | 'dark';
}

/**
 * Brand-neutral device chrome drawn over the 390×844 canvas in logical px (design §5.1): a
 * 9:41 status bar with signal, Wi-Fi and battery glyphs, an 11px punch-hole camera (no notch,
 * no Dynamic Island) and a 134×5 home indicator. Decorative: it sits inside the inert canvas.
 */
export function DeviceChrome({ statusBar, homeIndicator }: DeviceChromeProps): ReactNode {
  return (
    <div className="phone-chrome" data-status={statusBar} data-indicator={homeIndicator}>
      <div className="phone-chrome__status">
        <span>9:41</span>
        <span className="phone-chrome__glyphs">
          <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
            <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
            <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
            <rect x="15" y="0.5" width="3" height="11.5" rx="1" fill="currentColor" />
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
            <circle cx="8" cy="10.4" r="1.6" fill="currentColor" />
            <path d="M5.03 8.03A4.2 4.2 0 0 1 10.97 8.03" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M2.77 5.77A7.4 7.4 0 0 1 13.23 5.77" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <svg width="27" height="12" viewBox="0 0 27 12" aria-hidden="true">
            <rect x="0.75" y="0.75" width="22.5" height="10.5" rx="3.2" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
            <rect x="2.6" y="2.6" width="18.8" height="6.8" rx="1.6" fill="currentColor" />
            <rect x="24.4" y="4" width="2" height="4" rx="1" fill="currentColor" fillOpacity="0.45" />
          </svg>
        </span>
      </div>
      <span className="phone-chrome__punch" />
      <span className="phone-chrome__home" />
    </div>
  );
}
