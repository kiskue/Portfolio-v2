'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  lazy,
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import type { BrandId, SiteRoute } from '@/content/types';
import { useSearchParam } from '@/hooks/use-search-param';
import {
  APP_FILTERS,
  SHOWCASE_PARAM,
  SOURCE_FILTERS,
  effectiveSource,
  isFiltered,
  realCount,
  sameFilters,
  stepIndex,
  visibleFacets,
  withoutParams,
  type AppFilter,
  type BrandableApp,
  type ShowcaseFacet,
  type ShowcaseFilters,
  type SourceFilter,
} from '@/lib/showcase-filters';

/*
 * The Showcase wall's state (design §7). One provider around the server-rendered wall holds:
 *
 * - the filters, synced to ?app= and ?source= (and reading the BrandScope keys ?brand= and
 *   ?rbrand=) through useSearchParam, the way BrandScope does: history.replaceState, no server
 *   request, and only a tiny sync component inside Suspense, so the page stays static and the
 *   server (and a no-JS visit) shows the whole wall;
 * - the lightbox: every WallTile registers its server-rendered screen and details here, and the
 *   Radix dialog (loaded on first intent, like the menu sheet) renders the active one again at
 *   a fitted size. Nothing is rendered twice on the server and no screen is sent twice.
 *
 * Tiles read the filters to hide themselves; containers hide by CSS when none of their tiles
 * show. Focus returns to the tile of the screen on display when the lightbox closes.
 */

/** One screen the lightbox can show, registered by its WallTile. */
export interface LightboxEntry {
  readonly id: string;
  /** The dialog title, e.g. "FIG 2.3 SOS countdown". */
  readonly title: string;
  /** The screen at an inherited --ps (for replicas, the tile's own element). */
  readonly screen: ReactNode;
  /** The outer box's height / width: a phone 868 / 414, a screenshot card its image's aspect. */
  readonly ratio: number;
  /** Server-rendered facts: caption, purpose, source, alt text. */
  readonly details: ReactNode;
  readonly caseStudy: { readonly href: SiteRoute; readonly label: string };
  /** The skin a brandable replica shows: its BrandScope's brand name and --app-* variables. */
  readonly brand: { readonly name: string; readonly vars: CSSProperties } | null;
  /** Focuses the tile's button (focus return on close). */
  readonly focus: () => void;
}

export interface BrandParam {
  readonly ids: readonly BrandId[];
  readonly fallback: BrandId;
}

export interface ShowcaseView {
  readonly filters: ShowcaseFilters;
  /** The Source choice that applies ('all' for a replica-only selection). */
  readonly source: SourceFilter;
  readonly visibleIds: ReadonlySet<string>;
  readonly shown: number;
  readonly total: number;
  /** Real screenshots within the App and Brand choices: the n of "Real screenshots (n)". */
  readonly real: number;
  readonly filtered: boolean;
  /** Id of the element around the App radios (Clear filters moves focus there). */
  readonly appFieldId: string;
  readonly setApp: (app: AppFilter) => void;
  readonly setSource: (source: SourceFilter) => void;
  readonly clear: () => void;
}

export interface ShowcaseActions {
  /** Registers a tile's screen for the lightbox's stepping; returns the unregister function. */
  readonly register: (entry: LightboxEntry) => () => void;
  /** Opens the lightbox on this entry (and registers it). */
  readonly open: (entry: LightboxEntry) => void;
  /** Starts loading the lightbox code (first hover, focus or touch on a tile). */
  readonly preload: () => void;
}

const ViewContext = createContext<ShowcaseView | null>(null);
const ActionsContext = createContext<ShowcaseActions | null>(null);

export function useShowcaseView(): ShowcaseView {
  const view = use(ViewContext);
  if (view === null) throw new Error('useShowcaseView must be used inside a ShowcaseProvider');
  return view;
}

export function useShowcaseActions(): ShowcaseActions {
  const actions = use(ActionsContext);
  if (actions === null) throw new Error('useShowcaseActions must be used inside a ShowcaseProvider');
  return actions;
}

/** The lightbox code (Radix) loads on first intent, keeping it out of the page's first load. */
const loadLightbox = () => import('@/components/sections/showcase/lightbox-dialog');
const LightboxDialog = lazy(loadLightbox);

const PARAM_KEYS: readonly string[] = Object.values(SHOWCASE_PARAM);

interface UrlSetters {
  readonly app: (app: AppFilter) => void;
  readonly source: (source: SourceFilter) => void;
}

interface FiltersParamSyncProps {
  readonly brands: Readonly<Record<BrandableApp, BrandParam>>;
  readonly onUrl: (filters: ShowcaseFilters) => void;
  readonly settersRef: RefObject<UrlSetters | null>;
}

/** Reads (and writes) the filter params. Inside Suspense: it needs useSearchParams. Renders nothing. */
function FiltersParamSync({ brands, onUrl, settersRef }: FiltersParamSyncProps): ReactNode {
  const [app, setApp] = useSearchParam(SHOWCASE_PARAM.app, APP_FILTERS, 'all');
  const [source, setSource] = useSearchParam(SHOWCASE_PARAM.source, SOURCE_FILTERS, 'all');
  const [citizen] = useSearchParam(SHOWCASE_PARAM.citizenBrand, brands.citizen.ids, brands.citizen.fallback);
  const [responder] = useSearchParam(SHOWCASE_PARAM.responderBrand, brands.responder.ids, brands.responder.fallback);

  useEffect(() => {
    onUrl({ app, source, brands: { citizen, responder } });
  }, [app, source, citizen, responder, onUrl]);

  useEffect(() => {
    settersRef.current = { app: setApp, source: setSource };
    return () => {
      settersRef.current = null;
    };
  }, [setApp, setSource, settersRef]);

  return null;
}

interface LightboxState {
  readonly entry: LightboxEntry | null;
  readonly open: boolean;
  /** False when a route change closed it: focus then stays with the new page. */
  readonly returnFocus: boolean;
}

const CLOSED: LightboxState = { entry: null, open: false, returnFocus: true };

export interface ShowcaseProviderProps {
  /** Every tile's facets, in wall order (from derived showcaseEntries). */
  readonly facets: readonly ShowcaseFacet[];
  /** The brand ids and default of each white-label app (its BrandScope's options). */
  readonly brands: Readonly<Record<BrandableApp, BrandParam>>;
  /** Id for the element around the App radios (rendered by FilterBar). */
  readonly appFieldId: string;
  readonly children: ReactNode;
}

export function ShowcaseProvider({ facets, brands, appFieldId, children }: ShowcaseProviderProps): ReactNode {
  const defaults = useMemo<ShowcaseFilters>(
    () => ({ app: 'all', source: 'all', brands: { citizen: brands.citizen.fallback, responder: brands.responder.fallback } }),
    [brands],
  );
  const [filters, setFilters] = useState<ShowcaseFilters>(defaults);
  const setters = useRef<UrlSetters | null>(null);

  const onUrl = useCallback((next: ShowcaseFilters) => setFilters((prev) => (sameFilters(prev, next) ? prev : next)), []);

  const setApp = useCallback((app: AppFilter) => {
    setFilters((prev) => (prev.app === app ? prev : { ...prev, app }));
    setters.current?.app(app);
  }, []);

  const setSource = useCallback((source: SourceFilter) => {
    setFilters((prev) => (prev.source === source ? prev : { ...prev, source }));
    setters.current?.source(source);
  }, []);

  // One history write for every key: separate useSearchParam setters would each start from the
  // same (stale) query and undo one another. The BrandScopes follow the URL back to their defaults.
  const clear = useCallback(() => {
    setFilters(defaults);
    const { pathname, search, hash } = window.location;
    window.history.replaceState(null, '', `${pathname}${withoutParams(search, PARAM_KEYS)}${hash}`);
    requestAnimationFrame(() => {
      document.getElementById(appFieldId)?.querySelector<HTMLInputElement>('input:checked')?.focus();
    });
  }, [defaults, appFieldId]);

  const visible = useMemo(() => visibleFacets(facets, filters), [facets, filters]);
  const order = useMemo(() => visible.map((facet) => facet.id), [visible]);

  const view = useMemo<ShowcaseView>(
    () => ({
      filters,
      source: effectiveSource(facets, filters),
      visibleIds: new Set(order),
      shown: order.length,
      total: facets.length,
      real: realCount(facets, filters),
      filtered: isFiltered(filters, defaults),
      appFieldId,
      setApp,
      setSource,
      clear,
    }),
    [filters, facets, order, defaults, appFieldId, setApp, setSource, clear],
  );

  // ─── Lightbox ──────────────────────────────────────────────────────────────────────────

  const registry = useRef(new Map<string, LightboxEntry>());
  const [lightbox, setLightbox] = useState<LightboxState>(CLOSED);
  const [requested, setRequested] = useState(false);
  const pathname = usePathname();
  const [shownPath, setShownPath] = useState(pathname);
  const shownEntry = useRef<LightboxEntry | null>(null);

  // A route change (the case-study link) closes the lightbox, adjusting state during render so
  // the next page never renders with it open. Focus then stays with the new page.
  if (shownPath !== pathname) {
    setShownPath(pathname);
    if (lightbox.open) setLightbox({ ...lightbox, open: false, returnFocus: false });
  }

  // Focus returns to the tile of the screen on display, however the lightbox closed (Esc, the
  // close button, the scrim). Radix has no trigger here, so it would otherwise land on <body>.
  useEffect(() => {
    if (lightbox.open) {
      shownEntry.current = lightbox.entry;
      return;
    }
    const closed = shownEntry.current;
    shownEntry.current = null;
    if (closed && lightbox.returnFocus) closed.focus();
  }, [lightbox]);

  const register = useCallback((entry: LightboxEntry) => {
    registry.current.set(entry.id, entry);
    return () => {
      if (registry.current.get(entry.id) === entry) registry.current.delete(entry.id);
    };
  }, []);

  const open = useCallback((entry: LightboxEntry) => {
    registry.current.set(entry.id, entry);
    setRequested(true);
    setLightbox({ entry, open: true, returnFocus: true });
  }, []);

  const preload = useCallback(() => {
    void loadLightbox();
  }, []);

  const actions = useMemo<ShowcaseActions>(() => ({ register, open, preload }), [register, open, preload]);

  const step = useCallback(
    (delta: number) => {
      const current = lightbox.entry;
      if (!current || order.length === 0) return;
      const nextId = order[stepIndex(order.indexOf(current.id), delta, order.length)];
      const next = nextId === undefined ? undefined : registry.current.get(nextId);
      if (next) setLightbox({ entry: next, open: true, returnFocus: true });
    },
    [lightbox.entry, order],
  );

  const close = useCallback(() => setLightbox((current) => ({ ...current, open: false, returnFocus: true })), []);

  const position = lightbox.entry ? order.indexOf(lightbox.entry.id) + 1 : 0;

  return (
    <ActionsContext value={actions}>
      <ViewContext value={view}>
        <Suspense fallback={null}>
          <FiltersParamSync brands={brands} onUrl={onUrl} settersRef={setters} />
        </Suspense>
        {children}
        {requested && lightbox.entry ? (
          <Suspense fallback={null}>
            <LightboxDialog
              open={lightbox.open}
              entry={lightbox.entry}
              position={position}
              total={order.length}
              onStep={step}
              onClose={close}
            />
          </Suspense>
        ) : null}
      </ViewContext>
    </ActionsContext>
  );
}
