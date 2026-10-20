import { useSyncExternalStore } from 'react';
import { REDUCED_MOTION_QUERY } from '@/lib/display-settings';

/**
 * Reduced motion is the site setting OR the OS preference (the site can only add reduction,
 * see resolveDisplay). The pre-paint script writes html[data-motion]; when that attribute is
 * missing (inline scripts blocked) the media query alone decides.
 */
export function resolveReducedMotion(dataMotion: string | undefined, prefersReducedMotion: boolean): boolean {
  return dataMotion === 'reduce' || prefersReducedMotion;
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  return () => {
    query.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

function getSnapshot(): boolean {
  return resolveReducedMotion(
    document.documentElement.dataset.motion,
    window.matchMedia(REDUCED_MOTION_QUERY).matches,
  );
}

/** Server render and hydration assume full motion; the client value follows right after. */
function getServerSnapshot(): boolean {
  return false;
}

/** True when motion should be reduced; re-renders when the setting or the OS preference changes. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
