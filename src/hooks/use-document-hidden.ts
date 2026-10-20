import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

function getSnapshot(): boolean {
  return document.visibilityState === 'hidden';
}

function getServerSnapshot(): boolean {
  return false;
}

/** True while the tab is hidden (another tab, minimised window). False on the server. */
export function useDocumentHidden(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
