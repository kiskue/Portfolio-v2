/*
 * The app's Text variants (src/components/atoms/Text.tsx with the theme's line heights: tight
 * 1.2 for h1–h4, normal 1.4 for the rest), as RText `size` and `lh` in logical px. Spread one
 * into RText: <RText {...TYPE.h5} weight={700}>.
 */
export const TYPE = {
  h4: { size: 20, lh: 24 },
  h5: { size: 18, lh: 25.2 },
  h6: { size: 16, lh: 22.4 },
  body: { size: 16, lh: 22.4 },
  bodySm: { size: 14, lh: 19.6 },
  bodyXs: { size: 12, lh: 16.8 },
} as const;
