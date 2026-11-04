/**
 * The painted dragon's chunk entry (design §6.3). Home's island loads this module with a dynamic
 * import after the page has loaded and hydrated, and only when motion is allowed, so it is its own
 * size-capped chunk (tests/e2e/budgets.spec.ts). Nothing statically imports it at runtime.
 */

/** Written to the dragon element at runtime, so the speed gate can tell this chunk from any other (a duplicate lives in tests/support/budgets.ts). */
export const SCENE_CHUNK_MARKER = 'gm-scene-dragon';

export interface SceneHandle {
  dispose(): void;
}

/** Starts the scene in `host`. For now it only adds the dragon's element; the flight comes later. */
export function startScene(host: HTMLElement): SceneHandle {
  const dragon = document.createElement('div');
  dragon.className = 'hero-dragon';
  dragon.dataset.chunk = SCENE_CHUNK_MARKER;
  dragon.dataset.flight = 'idle';
  host.appendChild(dragon);
  return {
    dispose(): void {
      dragon.remove();
    },
  };
}
