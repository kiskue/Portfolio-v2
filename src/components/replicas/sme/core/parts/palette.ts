/*
 * The SME Panindio palette for the core screens (1.1–1.5), named after the app's own theme
 * scales (src/core/theme in the app: primary, accent, highlight, secondary, gray, error,
 * warning) plus the module accents the screens use. Hex values as shipped; the same values back
 * the --rx-sme-* tokens in ../../sme.css. All five core figures are light, so nothing here flips.
 */

export const SME = {
  white: '#ffffff',
  /** primary-500, the brand navy: TopNavBar and customer header bands, prices, primary buttons. */
  navy: '#1e4d8c',
  navy700: '#123265',
  navy100: '#c5d5f0',
  /** primary-50, surfaceSubtle: inactive period pills, image placeholders. */
  navy50: '#eaf0fa',
  /** accent-500 / success-500: PANINDIO, income, Cash, done steps. */
  green: '#27ae60',
  green600: '#209150',
  green200: '#9ed9b9',
  green50: '#e9f7ef',
  /** highlight-400: the awning stripe, Popular pill, Card payment. */
  amber: '#f5a623',
  /** secondary-500: the premium price tier and Maya. */
  indigo: '#5856d6',
  /** text: the brand dark navy. */
  ink: '#1a3a6b',
  /** textSecondary / gray-500. */
  ink2: '#6b7280',
  gray900: '#111827',
  gray800: '#1f2937',
  gray700: '#374151',
  gray400: '#9ca3af',
  gray300: '#d1d5db',
  gray200: '#e5e7eb',
  gray100: '#f3f4f6',
  gray50: '#f9fafb',
  /** border and borderSubtle. */
  border: '#d1dae8',
  hairline: '#e5eaf2',
  /** The app canvas (theme background) and the screen-specific canvases. */
  canvas: '#f2f5fa',
  canvasCustomer: '#f0f4f8',
  canvasCredit: '#f8f9ff',
  /** POS search and checkout inputs. */
  inputBg: '#f8f9fc',
  inputBorder: '#e2e8f0',
  /** The checkout sheet's inset surfaces (order items, unselected chips, totals). */
  sheetSurface: '#f8f9fa',
  error: '#ff3b30',
  error400: '#ff5c55',
  error50: '#fff5f5',
  red: '#ef4444',
  warning: '#ff9500',
  /** Delivery: the sky accent surface and its deep, text-safe partner. */
  sky: '#0ea5e9',
  skyDeep: '#0369a1',
  /** Credit ledger module colours. */
  violet: '#6d28d9',
  pay: '#047857',
  /** Module amber (sales target, the ledger's Due filter) and its text partner. */
  target: '#f59e0b',
  targetInk: '#92400e',
  /** Order status pill: Out for delivery (the active timeline step). */
  deliveryInk: '#075985',
  /** Verification pill and banner. */
  unverifiedBg: '#fef9c3',
  unverifiedInk: '#78350f',
  /** Map chips and controls. */
  mapScrim: 'rgb(0 0 0 / 0.55)',
  mapScrimBorder: 'rgb(255 255 255 / 0.18)',
  /** Photo scrims on storefront cards (sold out, the favourite button). */
  mediaScrim: 'rgb(15 23 42 / 0.55)',
} as const;

/** Credit standing pills (statusColors.ts creditStandingColors, light): fill, text, saturated mark. */
export const STANDING = {
  due: { bg: '#fef2f2', text: '#991b1b', accent: '#ef4444' },
  advance: { bg: '#e0f2fe', text: '#075985', accent: '#0369a1' },
  paid: { bg: '#ecfdf5', text: '#065f46', accent: '#10b981' },
} as const;

/** The top-three debtor medals. */
export const MEDAL = { gold: '#ffd700', silver: '#c0c0c0', bronze: '#cd7f32' } as const;

/**
 * A hex colour with the app's two-digit alpha suffix, exactly as the app writes it
 * (`${accent}1A` is 10%, `${accent}28` 16%, `${accent}50` 31%): withAlpha('#1e4d8c', '1A').
 */
export function withAlpha(hex: string, suffix: string): string {
  return `${hex}${suffix.toLowerCase()}`;
}
