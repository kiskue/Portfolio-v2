import type { CSSProperties, ReactNode } from 'react';
import type { RBoxProps } from '@/components/replicas/kit';
import { cn } from '@/lib/cn';

/*
 * The SME Panindio logo, ported from the app's BrandLogo atom (react-native-svg) to a hook-free
 * web component: the store icon is inline SVG (no image file is copied) and the wordmark is
 * spans. Sizes and colours are inline, as in the original StyleSheet, so the logo needs no app
 * CSS and draws the same anywhere.
 *
 * In the app, the TopNavBar shows `variant="wordmark" size="xs"` centred on the navy band, with
 * "SME" in #1A3A6B straight on #1E4D8C (low contrast, as shipped). To mirror it, pass
 * <SmeLogo variant="wordmark" size="xs" /> as RAppBar's `logo`; `logo={true}` draws the kit's
 * own mark instead.
 */

const NAVY = '#1e4d8c';
const AMBER = '#f5a623';
const GREEN = '#27ae60';
const ORANGE = '#f39c12';
const DARK = '#1a3a6b';
const WHITE = '#ffffff';

export const SME_LOGO_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type SmeLogoSize = (typeof SME_LOGO_SIZES)[number];
/** full: icon above the wordmark · icon: the store mark alone · wordmark: "SME" over "PANINDIO". */
export type SmeLogoVariant = 'full' | 'icon' | 'wordmark';

/** Icon edge in px (BrandLogo SIZE_MAP). */
export const SME_LOGO_ICON_PX: Readonly<Record<SmeLogoSize, number>> = { xs: 32, sm: 48, md: 64, lg: 96, xl: 128 };

/** Font sizes in px for "SME" and "PANINDIO" (BrandLogo FONT_SIZE_MAP). */
export const SME_LOGO_FONT_PX: Readonly<Record<SmeLogoSize, { readonly sme: number; readonly panindio: number }>> = {
  xs: { sme: 10, panindio: 7 },
  sm: { sme: 14, panindio: 10 },
  md: { sme: 20, panindio: 14 },
  lg: { sme: 28, panindio: 20 },
  xl: { sme: 36, panindio: 26 },
};

export interface SmeLogoProps extends RBoxProps {
  /** Default 'full'. */
  readonly variant?: SmeLogoVariant;
  /** Default 'md'. */
  readonly size?: SmeLogoSize;
}

/** The store mark in a 64×64 viewBox: gable roof, striped awning, windows, door and goods. */
function StoreIcon({ size }: { readonly size: number }): ReactNode {
  return (
    <svg className="rx-sme-logo__icon" width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
      <rect x="10" y="28" width="44" height="30" rx="3" fill={NAVY} />
      <rect x="24" y="40" width="16" height="18" rx="2" fill={AMBER} opacity={0.9} />
      <rect x="13" y="33" width="8" height="8" rx="1.5" fill={WHITE} opacity={0.8} />
      <rect x="43" y="33" width="8" height="8" rx="1.5" fill={WHITE} opacity={0.8} />
      <rect x="6" y="22" width="52" height="10" rx="2" fill={NAVY} />
      <g fill={AMBER}>
        <rect x="6" y="22" width="7" height="10" />
        <rect x="20" y="22" width="7" height="10" />
        <rect x="34" y="22" width="7" height="10" />
        <rect x="48" y="22" width="10" height="10" rx="2" />
      </g>
      <path
        d="M6 32 Q9.5 36 13 32 Q16.5 36 20 32 Q23.5 36 27 32 Q30.5 36 34 32 Q37.5 36 41 32 Q44.5 36 48 32 Q51.5 36 55 32 Q57 34 58 32"
        stroke={AMBER}
        strokeWidth={1.5}
        fill="none"
      />
      <polygon points="32,4 4,24 60,24" fill={NAVY} />
      <polygon points="32,8 8,24 56,24" fill={AMBER} opacity={0.35} />
      <rect x="22" y="34" width="10" height="8" rx="1" fill={AMBER} />
      <rect x="33" y="36" width="8" height="6" rx="1" fill={AMBER} opacity={0.7} />
      <circle cx="32" cy="50" r="1.5" fill={NAVY} />
    </svg>
  );
}

const TEXT_STACK: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 };

/** "SME" (900, tracking 3) over "PANINDIO" (800, tracking 1.5) whose i is a green stem with an orange dot. */
function Wordmark({ size }: { readonly size: SmeLogoSize }): ReactNode {
  const { sme, panindio } = SME_LOGO_FONT_PX[size];
  return (
    <span className="rx-sme-logo__text" style={TEXT_STACK}>
      <span className="rx-sme-logo__sme" style={{ color: DARK, fontSize: sme, fontWeight: 900, letterSpacing: 3, lineHeight: 'normal' }}>
        SME
      </span>
      <span
        className="rx-sme-logo__panindio"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          color: GREEN,
          fontSize: panindio,
          fontWeight: 800,
          letterSpacing: 1.5,
          lineHeight: 'normal',
          whiteSpace: 'nowrap',
        }}
      >
        <span>PANIND</span>
        <span
          className="rx-sme-logo__i"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: panindio * 1.3 }}
        >
          <span
            style={{
              width: panindio * 0.28,
              height: panindio * 0.28,
              marginBottom: panindio * 0.08,
              borderRadius: panindio * 0.14,
              background: ORANGE,
            }}
          />
          <span style={{ width: panindio * 0.14, height: panindio * 0.7, borderRadius: 1, background: GREEN }} />
        </span>
        <span>O</span>
      </span>
    </span>
  );
}

/**
 * The SME Panindio logo for replicas (architecture D4: SmeLogo in replicas/sme/parts). Decorative
 * (aria-hidden): the app is always named in the text around it.
 */
export function SmeLogo({ variant = 'full', size = 'md', className, style }: SmeLogoProps): ReactNode {
  const icon = variant === 'wordmark' ? null : <StoreIcon size={SME_LOGO_ICON_PX[size]} />;
  const words = variant === 'icon' ? null : <Wordmark size={size} />;
  return (
    <span
      className={cn('rx-sme-logo', className)}
      data-variant={variant}
      data-size={size}
      aria-hidden="true"
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10, ...style }}
    >
      {icon}
      {words}
    </span>
  );
}
