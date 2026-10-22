import type { ReactNode } from 'react';
import { DevSection, Term } from '@/app/dev/replicas/dev-section';
import { brandScopeProps } from '@/components/showcase/brand-options';
import { BrandScope, BrandSwitcher } from '@/components/showcase/brand-scope';
import { GlimpsePlayer } from '@/components/showcase/glimpse';

/** Section 2: the case-study hero player, inside a BrandScope where the app has brands. */
export function HeroSection(): ReactNode {
  return (
    <DevSection
      id="hero"
      title="2. Case-study heroes"
      intro={
        <>
          <Term>layout=&quot;hero&quot;</Term>: one phone (lg, md when narrow) with 24px step dots and Pause, no links.
          Inside a <Term>BrandScope</Term> the phones inherit the selected brand; switching re-skins them without
          re-rendering. The Citizen scopes keep <Term>?brand=</Term> and the Responder scopes <Term>?rbrand=</Term>, so
          the two apps never reset each other. These heroes carry no morph names (the trio above does).
        </>
      }
    >
      <div className="grid gap-12 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
        <BrandScope {...brandScopeProps('citizen')}>
          <div className="flex min-w-0 flex-col gap-6" data-dev-hero="citizen">
            <GlimpsePlayer glimpses={['hero.defensys-citizen']} layout="hero" size="inherit" morph={false} id="dev-hero-citizen" />
            <BrandSwitcher />
          </div>
        </BrandScope>
        <BrandScope {...brandScopeProps('responder')} param="rbrand">
          <div className="flex min-w-0 flex-col gap-6" data-dev-hero="responder">
            <GlimpsePlayer glimpses={['hero.defensys-responder']} layout="hero" size="inherit" morph={false} id="dev-hero-responder" />
            <BrandSwitcher />
          </div>
        </BrandScope>
        <div className="flex min-w-0 flex-col gap-6" data-dev-hero="sme">
          <GlimpsePlayer glimpses={['hero.sme-panindio']} layout="hero" size="lg" morph={false} id="dev-hero-sme" />
        </div>
      </div>
    </DevSection>
  );
}
