import type { ReactNode } from 'react';
import { FilterBar, ShowcaseEmpty } from '@/components/sections/showcase/filter-bar';
import { ShowcaseGroup } from '@/components/sections/showcase/showcase-group';
import { ShowcaseProvider, type BrandParam } from '@/components/sections/showcase/showcase-provider';
import { brandScopeProps } from '@/components/showcase/brand-options';
import { BrandScope, type BrandScopeProps } from '@/components/showcase/brand-scope';
import type { SegmentedOption } from '@/components/ui/segmented-control';
import { apps } from '@/content/apps/apps';
import { showcaseEntries } from '@/content/derived';
import { emptyStates } from '@/content/home';
import { cn } from '@/lib/cn';
import { SHOWCASE_PARAM, type AppFilter, type BrandableApp, type ShowcaseFacet } from '@/lib/showcase-filters';

/*
 * The Showcase wall (PLAN "Other pages", design §7): the filters, then one group per app in
 * showcase order (SME, Citizen, Responder), every screen from derived showcaseEntries: the 21
 * coded replicas and the store screenshots the site keeps (counts come from derived.ts; none
 * is hard-coded). The Citizen and Responder groups sit in BrandScopes on ?brand= and ?rbrand=,
 * so choosing a brand re-skins their replicas without re-rendering them.
 *
 * Everything is server-rendered, so without JavaScript the whole wall shows; the client islands
 * (ShowcaseProvider, FilterBar, WallTile and the lazily loaded lightbox) only filter it and open
 * screens large. The page reads no searchParams, so it stays static.
 */

const APP_FIELD_ID = 'showcase-app-filter';

function brandParam(scope: Omit<BrandScopeProps, 'children'>): BrandParam {
  return { ids: scope.options.map((option) => option.id), fallback: scope.defaultBrand };
}

export function ShowcaseWall({ className }: { readonly className?: string }): ReactNode {
  const scopes: Readonly<Record<BrandableApp, Omit<BrandScopeProps, 'children'>>> = {
    citizen: { ...brandScopeProps('citizen'), param: SHOWCASE_PARAM.citizenBrand },
    responder: { ...brandScopeProps('responder'), param: SHOWCASE_PARAM.responderBrand },
  };
  const facets = showcaseEntries.map(({ id, app, source, brand }): ShowcaseFacet => ({ id, app, source, brand }));
  const appOptions: SegmentedOption<AppFilter>[] = [
    { value: 'all', label: 'All', srLabel: 'All apps' },
    ...apps.map((app): SegmentedOption<AppFilter> => ({ value: app.id, label: app.short, srLabel: app.name })),
  ];

  return (
    <ShowcaseProvider
      facets={facets}
      brands={{ citizen: brandParam(scopes.citizen), responder: brandParam(scopes.responder) }}
      appFieldId={APP_FIELD_ID}
    >
      <div className={cn('flex flex-col gap-12', className)} data-showcase="">
        <FilterBar apps={appOptions} scopes={scopes} />
        <ShowcaseEmpty copy={emptyStates.showcase} />
        {apps.map((app) => {
          const entries = showcaseEntries.filter((entry) => entry.app === app.id);
          if (app.id === 'sme') return <ShowcaseGroup key={app.id} app={app} entries={entries} />;
          return (
            <BrandScope key={app.id} {...scopes[app.id]}>
              <ShowcaseGroup app={app} entries={entries} scoped />
            </BrandScope>
          );
        })}
      </div>
    </ShowcaseProvider>
  );
}
