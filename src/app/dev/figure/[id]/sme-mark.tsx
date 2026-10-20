import type { CSSProperties, ReactNode } from 'react';
import { SME_LOGO_SIZES, SmeLogo, type SmeLogoVariant } from '@/components/replicas/sme/parts/sme-logo';
import { ReviewSection } from './review-section';

const VARIANTS: readonly SmeLogoVariant[] = ['full', 'icon', 'wordmark'];
/** The SME TopNavBar band (primary-500), as in the app. */
const NAVY_BAND = '#1e4d8c';

interface LogoSampleProps {
  readonly label: string;
  readonly caption: string;
  readonly className: string;
  readonly style?: CSSProperties;
  readonly children: ReactNode;
}

/**
 * One logo sample, marked up like a phone: a role="img" picture whose inside is aria-hidden,
 * inert and data-replica-canvas, because it mirrors the shipped brand colours (PANINDIO green on
 * white, the SME wordmark on navy) and is exempt from the contrast check like any replica.
 */
function LogoSample({ label, caption, className, style, children }: LogoSampleProps): ReactNode {
  return (
    <figure className="flex max-w-full flex-col items-center gap-2">
      <div role="img" aria-label={label} className={className} style={style}>
        <div aria-hidden="true" inert data-replica-canvas="" className="contents">
          {children}
        </div>
      </div>
      <figcaption className="text-meta text-ink-3">{caption}</figcaption>
    </figure>
  );
}

const PLATE = 'flex min-h-36 items-center justify-center rounded-card border border-line bg-white p-4';

/**
 * The SME brand mark (SmeLogo, ported from the app's BrandLogo) for SME figures: SME has no
 * white-label brands, so this takes the place of the brand row. The navy band shows the
 * TopNavBar case (wordmark, xs) at 2× for checking the i-dot.
 */
export function SmeMark(): ReactNode {
  return (
    <ReviewSection
      id="mark"
      title="SME brand mark"
      intro="SmeLogo in its three variants (md), every size of the wordmark, and the TopNavBar case: the xs wordmark on the navy band, drawn at 2×. SME has no white-label brands."
    >
      <ul className="flex flex-wrap items-end gap-8">
        {VARIANTS.map((variant) => (
          <li key={variant}>
            <LogoSample label={`SME Panindio logo, ${variant} variant`} caption={variant} className={`${PLATE} min-w-36`}>
              <SmeLogo variant={variant} size="md" />
            </LogoSample>
          </li>
        ))}
        <li className="max-w-full">
          <LogoSample
            label="SME Panindio wordmark in five sizes"
            caption={`wordmark: ${SME_LOGO_SIZES.join(', ')}`}
            className={`${PLATE} max-w-full flex-wrap gap-6`}
          >
            {SME_LOGO_SIZES.map((size) => (
              <SmeLogo key={size} variant="wordmark" size={size} />
            ))}
          </LogoSample>
        </li>
        <li className="max-w-full">
          <LogoSample
            label="SME Panindio wordmark on the navy top bar"
            caption="TopNavBar: xs wordmark on #1E4D8C, at 2×"
            className="flex h-36 w-80 max-w-full items-center justify-center rounded-card"
            style={{ background: NAVY_BAND }}
          >
            <SmeLogo variant="wordmark" size="xs" style={{ transform: 'scale(2)' }} />
          </LogoSample>
        </li>
      </ul>
    </ReviewSection>
  );
}
