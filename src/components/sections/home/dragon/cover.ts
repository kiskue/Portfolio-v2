export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface CoverMap {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export const PAINTING: Size = { width: 1376, height: 768 };

/** CSS `object-fit: cover`: screen = painting * scale - offset. */
export function coverMap(
  box: Size,
  image: Size,
  position: { x: number; y: number },
): CoverMap {
  const scale = Math.max(box.width / image.width, box.height / image.height);
  return {
    scale,
    offsetX: position.x * (image.width * scale - box.width),
    offsetY: position.y * (image.height * scale - box.height),
  };
}

const PERCENT_PAIR = /^\s*(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%\s*$/;

export function parseObjectPosition(value: string): { x: number; y: number } {
  const m = PERCENT_PAIR.exec(value);
  if (!m) return { x: 0.5, y: 0.5 };
  return { x: Number(m[1]) / 100, y: Number(m[2]) / 100 };
}

/** The 1183x722 hero the flight paths were designed on. */
export const REFERENCE_MAP: CoverMap = coverMap(
  { width: 1183, height: 722 },
  PAINTING,
  { x: 0.7, y: 0.4 },
);

/** Design units (px of the reference hero) to painting pixels. */
export function unitsToPainting(p: { x: number; y: number }): { x: number; y: number } {
  return {
    x: (p.x + REFERENCE_MAP.offsetX) / REFERENCE_MAP.scale,
    y: (p.y + REFERENCE_MAP.offsetY) / REFERENCE_MAP.scale,
  };
}

export function paintingToScreen(
  p: { x: number; y: number },
  map: CoverMap,
): { x: number; y: number } {
  return { x: p.x * map.scale - map.offsetX, y: p.y * map.scale - map.offsetY };
}

/** Screen pixels per design unit under a live cover map. */
export function pxPerUnit(map: CoverMap): number {
  return map.scale / REFERENCE_MAP.scale;
}
