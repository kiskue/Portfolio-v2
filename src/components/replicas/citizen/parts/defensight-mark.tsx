import type { ReactNode } from 'react';

/*
 * Defensight, the face of the Citizen app's AI assistant, ported to plain SVG from the app's
 * react-native-svg DefensightMark: a shield outline, an orbit swoosh and a four-point spark on
 * lucide's 24-unit grid (stroke 2, round caps and joins). The shield and the swoosh take the
 * brand accent (currentColor, so the --app-* bridge re-skins it); the spark takes the severity
 * colour of the brief it sits on. Below 17 px the swoosh turns to mush and is dropped, as in
 * the app.
 */

const SHIELD_D = 'M12 2.75L4.5 5.9V12c0 4.2 3 7.5 7.5 9.25c4.5-1.75 7.5-5.05 7.5-9.25V5.9Z';
const ORBIT_D = 'M2.8 15.2C7.2 18.4 17 16.8 21.2 10.8';
const SPARK_D =
  'M12 5.9C12 8.695 13.505 10.2 16.3 10.2C13.505 10.2 12 11.705 12 14.5C12 11.705 10.495 10.2 7.7 10.2C10.495 10.2 12 8.695 12 5.9Z';

const ORBIT_MIN_SIZE = 17;
const ORBIT_STROKE_RATIO = 0.85;
/** Glyph as a share of the avatar tile, and the tile's corner radius as a share of its size. */
const GLYPH_RATIO = 0.72;
const RADIUS_RATIO = 0.34;

export interface DefensightMarkProps {
  /** Rendered box in logical px. */
  readonly size?: number;
  /** Spark fill (default: the stroke colour). */
  readonly sparkColor?: string;
}

/** The bare mark: shield + orbit in currentColor, spark in `sparkColor`. */
export function DefensightMark({ size = 16, sparkColor = 'currentColor' }: DefensightMarkProps): ReactNode {
  return (
    <svg className="rx-citizen-dmark" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={SHIELD_D} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {size >= ORBIT_MIN_SIZE ? (
        <path
          d={ORBIT_D}
          stroke="currentColor"
          strokeWidth={2 * ORBIT_STROKE_RATIO}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.9}
        />
      ) : null}
      <path d={SPARK_D} fill={sparkColor} />
    </svg>
  );
}

export interface DefensightAvatarProps {
  /** Tile size in logical px (the brief header uses 26). */
  readonly size?: number;
  readonly sparkColor?: string;
}

/** The tile the mark lives in: the brand accent at 12% behind the accent-coloured mark. */
export function DefensightAvatar({ size = 22, sparkColor }: DefensightAvatarProps): ReactNode {
  return (
    <span
      className="rx-citizen-davatar"
      style={{ width: size, height: size, borderRadius: Math.round(size * RADIUS_RATIO * 100) / 100 }}
    >
      <DefensightMark size={Math.round(size * GLYPH_RATIO)} sparkColor={sparkColor} />
    </span>
  );
}
