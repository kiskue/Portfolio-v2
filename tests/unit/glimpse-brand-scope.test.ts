import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { brandScopeProps } from '@/components/showcase/brand-options';
import { BrandScope, type BrandScopeProps } from '@/components/showcase/brand-scope';
import { citizenBrands, responderBrands } from '@/content/apps/brands';
import { parseParam, withParam } from '@/hooks/search-param';

/*
 * BrandScope's URL key (design §5.5): ?brand= by default, or the scope's own `param`, so one page
 * (Showcase) can host a Citizen scope and a Responder scope without a brand id of one app
 * resetting the other to its default.
 */

// The scope reads the URL after hydration (useSearchParam inside Suspense); give it one here so
// the sync component renders without the Next.js router.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('brand=1hope&rbrand=sjdm'),
  usePathname: () => '/showcase',
}));

const citizenIds = citizenBrands.map((brand) => brand.id);
const responderIds = responderBrands.map((brand) => brand.id);

// Children go in as createElement's third argument (react/no-children-prop).
function scope(props: Omit<BrandScopeProps, 'children'>, children: string): string {
  return renderToStaticMarkup(createElement(BrandScope, props as BrandScopeProps, children));
}

describe('BrandScope param', () => {
  it('accepts any key (a string, not only "brand")', () => {
    const key: NonNullable<BrandScopeProps['param']> = 'rbrand';
    expect(key).toBe('rbrand');
  });

  it('keeps the selection under ?brand= by default, or under the scope’s own key', () => {
    const citizen = scope(brandScopeProps('citizen'), 'citizen phones');
    const responder = scope({ ...brandScopeProps('responder'), param: 'rbrand' }, 'responder phones');
    expect(citizen).toContain('data-brand-scope="citizen"');
    expect(citizen).toContain('data-brand-param="brand"');
    expect(responder).toContain('data-brand-scope="responder"');
    expect(responder).toContain('data-brand-param="rbrand"');
    // The server and the first paint show each app's default brand; the URL applies after hydration.
    expect(citizen).toContain('data-brand="smile-safe-taytay"');
    expect(responder).toContain('data-brand="defensys"');
  });

  it('reads two keys independently, so neither scope resets the other', () => {
    const search = 'brand=1hope&rbrand=sjdm';
    expect(parseParam(new URLSearchParams(search).get('brand'), citizenIds, 'smile-safe-taytay')).toBe('1hope');
    expect(parseParam(new URLSearchParams(search).get('rbrand'), responderIds, 'defensys')).toBe('sjdm');
    // One shared key: a Citizen id is unknown to Responder and reads as its default (the reset).
    expect(parseParam(new URLSearchParams('brand=1hope').get('brand'), responderIds, 'defensys')).toBe('defensys');
    // Setting one key keeps the other; the default removes only its own key.
    expect(withParam(search, 'rbrand', 'bagong-pag-asa', 'defensys')).toBe('?brand=1hope&rbrand=bagong-pag-asa');
    expect(withParam(search, 'brand', 'smile-safe-taytay', 'smile-safe-taytay')).toBe('?rbrand=sjdm');
  });
});
