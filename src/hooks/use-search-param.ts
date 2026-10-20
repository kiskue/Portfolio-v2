import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { parseParam, withParam } from '@/hooks/search-param';

/**
 * One URL-synced choice, e.g. `useSearchParam('type', ['all', ...PROJECT_TYPES], 'all')` for the
 * Projects filter or `?brand=` for the brand switcher. Unknown values read as the fallback, and
 * setting the fallback removes the param.
 *
 * Updates use window.history.replaceState, which Next integrates with useSearchParams and
 * usePathname (bundled docs: "Native History API"): no history entry, no scroll, the #hash is
 * kept, and — unlike router.replace — no server round trip, so the static page's RSC payload is
 * never refetched and the control updates at once (design §5.5).
 *
 * STATIC RENDERING: useSearchParams opts the component out of prerendering up to the nearest
 * <Suspense>. Every caller MUST sit inside <Suspense fallback={…default state…}>, otherwise
 * `next build` fails for the static route (design §11: "useSearchParams sits inside Suspense
 * with a default render").
 */
export function useSearchParam<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): readonly [value: T, setValue: (value: T) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const value = parseParam(searchParams.get(key), allowed, fallback);

  const setValue = useCallback(
    (next: T) => {
      const query = withParam(searchParams.toString(), key, next, fallback);
      window.history.replaceState(null, '', `${pathname}${query}${window.location.hash}`);
    },
    [searchParams, pathname, key, fallback],
  );

  return [value, setValue] as const;
}
