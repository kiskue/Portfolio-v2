import type { ReactNode } from 'react';

export interface MapScreenProps {
  /** The full-bleed map (RMapCanvas with className rx-responder-map). */
  readonly map: ReactNode;
  /** The heading puck overlay, in canvas px. */
  readonly puck: ReactNode;
  readonly header: ReactNode;
  /** A full-width strip under the header (the public alert). */
  readonly strip?: ReactNode;
  /** Layers over the whole screen: the dispatch sheet, the toast. */
  readonly overlay?: ReactNode;
  /** Chrome positioned inside the map area under the header: glass stack, FABs, action pill. */
  readonly children?: ReactNode;
}

/**
 * The Emergency Map screen frame. The map fills the canvas (so town coordinates are screen
 * coordinates); the header, the strip and the floating chrome sit over it in a column.
 */
export function MapScreen({ map, puck, header, strip, overlay, children }: MapScreenProps): ReactNode {
  return (
    <>
      {map}
      {puck}
      <div className="rx-responder-mapscreen">
        {header}
        {strip}
        <div className="rx-responder-mapzone">{children}</div>
      </div>
      {overlay}
    </>
  );
}
