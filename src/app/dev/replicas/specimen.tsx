import type { ReactNode } from 'react';
import { RCanvas } from '@/components/replicas/kit';
import type { AppId } from '@/content/types';

export interface SpecimenProps {
  /** The kit part(s) shown, e.g. "RButton". */
  readonly name: string;
  readonly note?: string;
  readonly app?: AppId;
  readonly theme?: 'light' | 'dark';
  /** A fixed canvas height in px, for absolutely positioned parts (bars, sheets, backdrops). */
  readonly height?: number;
  readonly pad?: number;
  readonly children: ReactNode;
}

/**
 * One kit part at 1:1 (logical px = CSS px) on a cropped canvas with its app's tokens. Like
 * a phone screen it is inert, aria-hidden and marked data-replica-canvas; the caption names it.
 */
export function Specimen({ name, note, app = 'citizen', theme = 'light', height, pad = 12, children }: SpecimenProps): ReactNode {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div aria-hidden="true" inert data-replica-canvas="" className="overflow-hidden rounded-control border border-line">
        <RCanvas app={app} theme={theme} style={{ width: '100%', height: height ?? 'auto', padding: pad }}>
          {children}
        </RCanvas>
      </div>
      <figcaption className="text-meta text-ink-3">
        <span className="block font-mono text-fig text-ink-2 uppercase">{name}</span>
        {note ?? null}
      </figcaption>
    </figure>
  );
}
