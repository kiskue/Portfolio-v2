/*
 * The page background (design §3.4): one fixed layer behind everything, never moving.
 * - the canvas gradient, bg to bg-2;
 * - four large elliptical arcs, 1px --c-deco strokes that stay 1px at any scale
 *   (vector-effect: non-scaling-stroke); most of each arc hides behind the cards, so only the
 *   template's faint curves show in the gaps;
 * - a grain tile (feTurbulence, 160px) at 5% opacity in light and 3% in dark, no blend mode.
 *
 * It sits outside <main> (a size container would trap fixed descendants), is aria-hidden and
 * ignores the pointer. While a Radix dialog locks scroll its right edge stays put
 * (--removed-body-scroll-bar-size), so nothing behind the scrim shifts.
 */

/**
 * cx, cy, rx, ry, rotation (degrees) in a 1600×900 artboard that 'slice' scales to cover the
 * viewport. Fitted to the arc fragments visible in the template at 1447×722: two steep curves
 * through the headline band, one leaving the left gutter mid-height, one at the right edge.
 * Most of each ellipse falls behind the opaque sidebar and the bento.
 */
const ARCS: readonly (readonly [number, number, number, number, number])[] = [
  [357, 1116, 602, 1262, -10],
  [588, 1165, 548, 1338, -3],
  [1418, 1300, 1452, 778, 20],
  [1574, 953, 790, 262, 58],
];

const GRAIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">' +
  '<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter>' +
  '<rect width="160" height="160" filter="url(#g)"/></svg>';

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

export function DecorLayer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 start-0 end-[var(--removed-body-scroll-bar-size,0px)] overflow-hidden bg-linear-to-b from-bg to-bg-2 print:hidden"
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
        {ARCS.map(([cx, cy, rx, ry, rotate]) => (
          <ellipse
            key={`${cx} ${cy} ${rotate}`}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            transform={`rotate(${rotate} ${cx} ${cy})`}
            className="stroke-deco"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="absolute inset-0 opacity-5 dark:opacity-3" style={{ backgroundImage: GRAIN, backgroundSize: '160px 160px' }} />
    </div>
  );
}
