import type { ReactNode } from 'react';

export interface MapScreenProps {
  /** The full-bleed map: RMapCanvas with a scene and className rx-responder-map (it draws the puck). */
  readonly map: ReactNode;
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
export function MapScreen({ map, header, strip, overlay, children }: MapScreenProps): ReactNode {
  return (
    <>
      {map}
      <div className="rx-responder-mapscreen">
        {header}
        {strip}
        <div className="rx-responder-mapzone">{children}</div>
      </div>
      {overlay}
    </>
  );
}
