/* eslint-disable react/no-children-prop -- .ts tests have no JSX, and SourcePane's prop type requires `children`. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { brandOptions, brandScopeProps } from '@/components/showcase/brand-options';
import { SourcePane, SourceToggle } from '@/components/showcase/source-toggle';
import { StorePanes } from '@/components/showcase/store-panes';
import { citizenBrands, responderBrands } from '@/content/apps/brands';
import { listingsForBrand } from '@/content/apps/store';
import { brandVars } from '@/lib/brand-vars';
import { ph } from '@/lib/placeholder';

/*
 * Brand scope data, the source toggle and the store panes (design §5.4, §5.5): options carry
 * each brand's variables, mark, kept screenshot count and an honest status; the toggle offers
 * store screenshots only when some exist; store images are frameless cards labelled by listing.
 */

describe('brandOptions', () => {
  it('lists the six public Citizen brands with their store icon, variables and kept screenshots', () => {
    const options = brandOptions('citizen');
    expect(options.map((option) => option.name)).toEqual(citizenBrands.map((brand) => brand.name));
    for (const [index, option] of options.entries()) {
      const brand = citizenBrands[index];
      if (!brand) throw new Error('missing brand');
      const kept = listingsForBrand(brand.id).reduce((total, listing) => total + listing.screenshots.length, 0);
      expect(option).toMatchObject({ id: brand.id, icon: brand.icon, screenshots: kept, vars: brandVars(brand) });
      expect(option.monogram).toBeUndefined();
    }
    expect(options.map((option) => option.screenshots)).toEqual([6, 13, 3, 3, 5, 5]);
  });

  it('states store presence from the listings, never hard-coded', () => {
    const status = Object.fromEntries(brandOptions('citizen').map((option) => [option.id, option.status]));
    expect(status['smile-safe-taytay']).toEqual(['On Google Play and the App Store']);
    expect(status['1hope']).toEqual(['On Google Play and the App Store']);
    expect(status['defensys-safe']).toEqual(['On Google Play']);
  });

  it('gives Responder brands monograms, no screenshots and honest statuses', () => {
    const options = brandOptions('responder');
    expect(options.map((option) => [option.id, option.monogram, option.icon, option.screenshots])).toEqual(
      responderBrands.map((brand) => [brand.id, brand.monogram, null, 0]),
    );
    const status = Object.fromEntries(options.map((option) => [option.id, option.status]));
    expect(status.defensys).toEqual(['Private distribution', 'platform build']);
    // Deployment is unconfirmed for these builds: a placeholder, hidden when the site goes public.
    expect(status['smile-taytay']).toEqual(['Private distribution', 'LGU build', ph('deployment to confirm')]);
    expect(status.sjdm).toEqual(['Private distribution', 'LGU build', ph('deployment to confirm')]);
    expect(status['bagong-pag-asa']).toEqual(['Private distribution', 'In setup']);
    for (const option of options) expect(option.vars['--app-logo']).toBeUndefined();
  });

  it('brandScopeProps starts each app on its default brand', () => {
    expect(brandScopeProps('citizen')).toMatchObject({ app: 'citizen', defaultBrand: 'smile-safe-taytay' });
    expect(brandScopeProps('responder')).toMatchObject({ app: 'responder', defaultBrand: 'defensys' });
  });
});

describe('SourceToggle', () => {
  const html = (store: number, replica = 4) =>
    renderToStaticMarkup(
      createElement(
        SourceToggle,
        { counts: { replica, store } },
        createElement(SourcePane, { source: 'replica', children: 'replicas' }),
        createElement(SourcePane, { source: 'store', children: 'screenshots' }),
      ),
    );

  it('shows the fixed label where no store screenshots exist (SME, Responder)', () => {
    const markup = html(0);
    expect(markup).toContain('Coded replica · fictional data');
    expect(markup).not.toContain('type="radio"');
    expect(markup).toContain('<div data-source-pane="replica">replicas</div>');
    expect(markup).toContain('<div hidden="" data-source-pane="store">screenshots</div>');
  });

  it('offers "Coded replica | Store screenshots (n)" when there are some, replicas first', () => {
    const markup = html(5);
    expect(markup).toContain('Coded replica');
    expect(markup).toContain('Store screenshots (5)');
    expect(markup.match(/type="radio"/g)).toHaveLength(2);
    expect(markup).toMatch(/checked=""[^>]*value="replica"|value="replica"[^>]*checked=""/);
  });

  it('starts on the store side when there are no replicas', () => {
    const markup = html(5, 0);
    expect(markup).toContain('<div data-source-pane="store">screenshots</div>');
  });
});

describe('StorePanes', () => {
  const markup = renderToStaticMarkup(createElement(StorePanes, { size: 'sm', id: 't' }));

  it('renders one pane per Citizen brand with its kept screenshots as frameless cards', () => {
    expect(markup.match(/data-source-pane="store"/g)).toHaveLength(citizenBrands.length);
    const kept = citizenBrands.reduce(
      (total, brand) => total + listingsForBrand(brand.id).reduce((sum, listing) => sum + listing.screenshots.length, 0),
      0,
    );
    expect(markup.match(/class="screen-card"/g)).toHaveLength(kept);
    expect(markup).not.toContain('class="phone"');
  });

  it('labels images by the listing they come from (Defensys SAFE publishes SJDM-branded images)', () => {
    expect(markup).toContain('From the Defensys SAFE listing on Google Play');
    expect(markup).toContain('From the Smile SAFE Taytay listing on the App Store');
    expect(markup).toContain('Google Play · 1 of 3');
    expect(markup).toContain('SJDM-branded');
  });
});
