import { ChevronRight, Clock, Layers, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, rStyle } from '@/components/replicas/kit';
import { czToday, type CzQuake } from '@/components/replicas/citizen/sample-data';

/** Intensity tiles by whole magnitude (constant/ui.ts intensityConfig): fill, ink and ring. */
const INTENSITY = {
  minor: { fill: 'rgb(76 175 80 / 0.15)', ink: '#1B5E20', ring: '#4CAF50' },
  light: { fill: 'rgb(251 192 45 / 0.18)', ink: '#F57F17', ring: '#FBC02D' },
} as const;

/**
 * One Earthquake Monitor row (EarthquakeMonitoring.tsx): a 70 px magnitude tile tinted by
 * intensity (with the red "!" for quakes under an hour old), the time and a distance pill in
 * the brand primary, the place, the depth and date line, and a #D1D5DB chevron.
 */
export function QuakeCard({ quake }: { readonly quake: CzQuake }): ReactNode {
  const tone = Number(quake.magnitude) < 3 ? INTENSITY.minor : INTENSITY.light;
  return (
    <span className="rx-citizen-quake">
      <span
        className="rx-citizen-quake__mag"
        style={rStyle({ '--rx-citizen-mag-fill': tone.fill, '--rx-citizen-mag-ink': tone.ink, '--rx-citizen-mag-ring': tone.ring })}
      >
        <span className="rx-citizen-quake__value">{quake.magnitude}</span>
        <span className="rx-citizen-quake__label">{quake.label}</span>
        {quake.recent ? <span className="rx-citizen-quake__new">!</span> : null}
      </span>
      <span className="rx-citizen-quake__body">
        <span className="rx-citizen-quake__top">
          <span className="rx-citizen-quake__ago">
            <RGlyph icon={Clock} size={14} />
            <span>{quake.ago}</span>
          </span>
          <span className="rx-citizen-quake__dist">
            <RGlyph icon={MapPin} size={12} fill="currentColor" className="rx-citizen-solid-pin" />
            <span>{quake.distance}</span>
          </span>
        </span>
        <span className="rx-citizen-quake__place">{quake.place}</span>
        <span className="rx-citizen-quake__meta">
          <span className="rx-citizen-quake__depth">
            <RGlyph icon={Layers} size={12} />
            <span>{quake.depth}</span>
          </span>
          <span className="rx-citizen-quake__sep">•</span>
          <span>{czToday.long}</span>
        </span>
      </span>
      <RGlyph icon={ChevronRight} size={20} className="rx-citizen-quake__chev" />
    </span>
  );
}
