'use client';

import Image from 'next/image';
import {
  createContext,
  Suspense,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MetaLine } from '@/components/ui/copy';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import type { AssetPath, BrandId, Segments } from '@/content/types';
import { parseParam, withParam } from '@/hooks/search-param';
import { useSearchParam } from '@/hooks/use-search-param';
import type { BrandCssVars } from '@/lib/brand-vars';
import { cn } from '@/lib/cn';

/*
 * Brand switching for a section of phones (design §5.5). BrandScope puts the selected brand's
 * --app-* variables (and data-brand) on ONE wrapper, so switching re-renders no replica: the
 * phones inside are server-rendered children (ScreenView brandMode="inherit") whose DOM never
 * changes. BrandSwitcher is the native-radio chip group; useBrand reads the selection.
 *
 * The selection follows ?brand= (or the scope's own `param`, e.g. ?rbrand= for a Responder scope
 * beside a Citizen one) with useSearchParam's rules (history.replaceState: no history entry, no
 * server request). Reading the URL needs a Suspense boundary on a static page, so only a
 * tiny reader (BrandParamSync) sits inside one: the server and the first paint show the default
 * brand, and the page stays static. There is no crossfade: the site's one View Transition is the
 * phone morph (PLAN → Motion).
 *
 * After hydration that reader mounts in a commit of its own, and Next.js only follows
 * history.replaceState from the hydration commit's effects on. So a brand chosen before the
 * reader mounts (a click right after hydration) is held and written when it mounts, and the
 * reader takes the brand from the live URL, never from useSearchParams alone, which can trail
 * window.location: an early choice is neither lost nor undone. The wrapper carries
 * data-brand-ready once the scope follows the URL.
 */

/** The fixed caption under every switcher (design §5.5). */
const BRAND_CAPTION ='Brand colours re-skin headers, tabs and buttons. Emergency colours never change, by design.';

/** A switcher choice. Everything is serialisable: the server computes `vars` with brandVars(). */
export interface BrandOption {
  readonly id: BrandId;
  /** Exactly as published, e.g. "1Hope". */
  readonly name: string;
  readonly vars: BrandCssVars;
  /** The public store icon (Citizen), or null when the brand shows a monogram (Responder). */
  readonly icon: AssetPath | null;
  readonly monogram?: string;
  /** Store screenshots kept for this brand (all its listings); 0 or absent: none. */
  readonly screenshots?: number;
  /** An honest status line, e.g. ['Private distribution', 'In setup'] (placeholder-aware). */
  readonly status?: Segments;
}

export interface BrandScopeProps {
  readonly app: 'citizen' | 'responder';
  readonly defaultBrand: BrandId;
  readonly options: readonly BrandOption[];
  /**
   * The search param that keeps the selection (default 'brand'). Scopes with the same param
   * follow one selection; give a second app's scope its own key (e.g. 'rbrand' for Responder
   * next to a Citizen scope on Showcase), or a brand id of one app resets the other to its default.
   */
  readonly param?: string;
  readonly children: ReactNode;
  /** Classes for the wrapper (default: display contents, so it adds no layout box). */
  readonly className?: string;
}

export interface BrandState {
  readonly app: 'citizen' | 'responder';
  readonly brand: BrandId;
  readonly options: readonly BrandOption[];
  readonly setBrand: (brand: BrandId) => void;
  /** The selected option. */
  readonly option: BrandOption | undefined;
}

const BrandContext = createContext<BrandState | null>(null);

/**
 * Sets ?<param>= in the live URL with useSearchParam's rules: history.replaceState, the fallback
 * removes the key, the other params keep their order and the #hash stays.
 */
function writeBrandParam(param: string, brand: BrandId, fallback: BrandId): void {
  const { pathname, search, hash } = window.location;
  window.history.replaceState(null, '', `${pathname}${withParam(search, param, brand, fallback)}${hash}`);
}

interface BrandParamSyncProps {
  readonly param: string;
  readonly ids: readonly BrandId[];
  readonly fallback: BrandId;
  readonly onUrlBrand: (brand: BrandId) => void;
  /** Called once the reader has mounted (Next.js follows history from then on); returns its cleanup. */
  readonly onLive: () => () => void;
}

/**
 * Follows ?<param>= (inside Suspense: it needs useSearchParams). Renders nothing. On mount it first
 * lets the scope write a choice made before it existed, then reads the brand from the live URL:
 * the hook's value only says when to read, because it can trail window.location.
 */
function BrandParamSync({ param, ids, fallback, onUrlBrand, onLive }: BrandParamSyncProps): ReactNode {
  const [value] = useSearchParam(param, ids, fallback);
  useEffect(() => onLive(), [onLive]);
  useEffect(() => {
    onUrlBrand(parseParam(new URLSearchParams(window.location.search).get(param), ids, fallback));
  }, [value, param, ids, fallback, onUrlBrand]);
  return null;
}

export function BrandScope({ app, defaultBrand, options, param = 'brand', children, className }: BrandScopeProps): ReactNode {
  const ids = useMemo(() => options.map((option) => option.id), [options]);
  const fallback = ids.includes(defaultBrand) ? defaultBrand : (ids[0] ?? defaultBrand);
  const [brand, setBrandState] = useState<BrandId>(fallback);
  // True while the reader is mounted (Next.js follows history by then): a choice is written at once.
  const live = useRef(false);
  // The latest choice made before that, written when the reader mounts.
  const pending = useRef<BrandId | null>(null);
  // `live`, rendered as data-brand-ready.
  const [ready, setReady] = useState(false);

  const onUrlBrand = useCallback((next: BrandId) => setBrandState(next), []);
  const onLive = useCallback(() => {
    live.current = true;
    const held = pending.current;
    pending.current = null;
    if (held !== null) writeBrandParam(param, held, fallback);
    setReady(true);
    return () => {
      live.current = false;
      setReady(false);
    };
  }, [param, fallback]);
  const setBrand = useCallback(
    (next: BrandId) => {
      if (!ids.includes(next)) return;
      setBrandState(next);
      if (live.current) writeBrandParam(param, next, fallback);
      else pending.current = next;
    },
    [ids, param, fallback],
  );

  const option = options.find((candidate) => candidate.id === brand);
  const state = useMemo<BrandState>(() => ({ app, brand, options, setBrand, option }), [app, brand, options, setBrand, option]);

  return (
    <BrandContext value={state}>
      <div
        className={cn('contents', className)}
        data-brand-scope={app}
        data-brand={brand}
        data-brand-param={param}
        data-brand-ready={ready ? '' : undefined}
        style={option?.vars}
      >
        <Suspense fallback={null}>
          <BrandParamSync param={param} ids={ids} fallback={fallback} onUrlBrand={onUrlBrand} onLive={onLive} />
        </Suspense>
        {children}
      </div>
    </BrandContext>
  );
}

/** The selected brand of the nearest BrandScope. */
export function useBrand(): BrandState {
  const state = use(BrandContext);
  if (state === null) throw new Error('useBrand must be used inside a BrandScope');
  return state;
}

/** The nearest BrandScope's state, or null outside one (for parts that also work alone). */
export function useOptionalBrand(): BrandState | null {
  return use(BrandContext);
}

/** The chip's mark: the public store icon (Citizen) or a monogram tile (Responder). */
function BrandMark({ option }: { readonly option: BrandOption }): ReactNode {
  if (option.icon) {
    return <Image src={option.icon} alt="" width={24} height={24} sizes="24px" className="size-6 shrink-0 rounded-[6px]" />;
  }
  return (
    <span
      aria-hidden="true"
      className="inline-grid size-6 shrink-0 place-items-center rounded-[6px] border border-line bg-sunken text-[0.75rem] leading-none font-bold text-ink forced-colors:forced-color-adjust-auto"
    >
      {option.monogram ?? option.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export interface BrandSwitcherProps {
  /** Group label (default "App brand"). */
  readonly label?: string;
  readonly className?: string;
}

/**
 * The brand chips (native radios, arrow keys move the choice) with each brand's store icon or
 * monogram, then the selected brand's status line and the fixed caption.
 */
export function BrandSwitcher({ label = 'App brand', className }: BrandSwitcherProps): ReactNode {
  const { brand, options, setBrand, option } = useBrand();
  const name = useId();
  const noteId = `${name}-note`;
  const choices: SegmentedOption<BrandId>[] = options.map((choice) => ({
    value: choice.id,
    label: choice.name,
    media: <BrandMark option={choice} />,
  }));
  const status = option?.status;
  return (
    <div className={cn('flex flex-col gap-2', className)} data-brand-switcher="">
      <SegmentedControl name={name} legend={label} options={choices} value={brand} onValueChange={setBrand} look="chips" describedBy={noteId} />
      <div id={noteId} className="text-meta text-ink-3">
        {option && status && status.length > 0 ? (
          <MetaLine as="p" segments={[option.name, ...status]} className="font-semibold text-ink-2" />
        ) : null}
        <p>{BRAND_CAPTION}</p>
      </div>
    </div>
  );
}
