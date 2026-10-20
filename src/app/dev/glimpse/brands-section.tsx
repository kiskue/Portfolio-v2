import type { ReactNode } from 'react';
import { DevSection, Term } from '@/app/dev/replicas/dev-section';
import { brandScopeProps } from '@/components/showcase/brand-options';
import { BrandScope, BrandSwitcher } from '@/components/showcase/brand-scope';
import { ScreenFigure } from '@/components/showcase/screen-figure';
import { SourcePane, SourceToggle } from '@/components/showcase/source-toggle';
import { StorePanes } from '@/components/showcase/store-panes';
import { figures } from '@/content/apps/figures';
import type { AppId } from '@/content/types';

/** The replica figures of one app that brand colours re-skin (SME: its first three figures). */
function replicaIds(app: AppId) {
  const ids = figures.filter((figure) => figure.app === app && (app === 'sme' || figure.brandable)).map((figure) => figure.id);
  return app === 'sme' ? ids.slice(0, 3) : ids;
}

function ReplicaGrid({ app }: { readonly app: AppId }): ReactNode {
  return (
    <ul className="flex flex-wrap gap-6">
      {replicaIds(app).map((id) => (
        <li key={id}>
          <ScreenFigure source={{ kind: 'replica', figure: id }} size="sm" brandMode="inherit" />
        </li>
      ))}
    </ul>
  );
}

/** Section 3: BrandScope, BrandSwitcher and SourceToggle as a case study's Screens section uses them. */
export function BrandsSection(): ReactNode {
  const citizen = replicaIds('citizen');
  const responder = replicaIds('responder');
  const sme = replicaIds('sme');
  return (
    <DevSection
      id="brands"
      title="3. Brand scope and source toggle"
      intro={
        <>
          Selecting a brand sets <Term>data-brand</Term> and the brand&apos;s CSS variables on one wrapper, so no phone
          re-renders; the choice is kept in <Term>?brand=</Term>. The source toggle offers store screenshots only for brands
          that have them, shown frameless and labelled by their listing. SME and Responder show a fixed label.
        </>
      }
    >
      <div className="flex flex-col gap-14">
        <BrandScope {...brandScopeProps('citizen')}>
          <section aria-labelledby="dev-brands-citizen" className="flex flex-col gap-5" data-dev-brands="citizen">
            <h3 id="dev-brands-citizen" className="text-h3-hero">
              Defensys Citizen
            </h3>
            <BrandSwitcher />
            <SourceToggle counts={{ replica: citizen.length, store: 0 }}>
              <SourcePane source="replica">
                <ReplicaGrid app="citizen" />
              </SourcePane>
              <StorePanes size="sm" headingLevel="h4" id="dev-store" />
            </SourceToggle>
          </section>
        </BrandScope>

        <BrandScope {...brandScopeProps('responder')}>
          <section aria-labelledby="dev-brands-responder" className="flex flex-col gap-5" data-dev-brands="responder">
            <h3 id="dev-brands-responder" className="text-h3-hero">
              Defensys Responder
            </h3>
            <BrandSwitcher />
            <SourceToggle counts={{ replica: responder.length, store: 0 }}>
              <SourcePane source="replica">
                <ReplicaGrid app="responder" />
              </SourcePane>
            </SourceToggle>
          </section>
        </BrandScope>

        <section aria-labelledby="dev-brands-sme" className="flex flex-col gap-5" data-dev-brands="sme">
          <h3 id="dev-brands-sme" className="text-h3-hero">
            SME Panindio
          </h3>
          <SourceToggle counts={{ replica: sme.length, store: 0 }}>
            <SourcePane source="replica">
              <ReplicaGrid app="sme" />
            </SourcePane>
          </SourceToggle>
        </section>
      </div>
    </DevSection>
  );
}
