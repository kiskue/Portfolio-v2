import { ChevronRight, Clock, Flame, MapPin, Mountain, TreePine, Waves, ZapOff, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, rStyle } from '@/components/replicas/kit';
import type { CzHazard, CzHazardKind } from '@/components/replicas/citizen/sample-data';

/** Lucide stand-ins for the server's 35 px hazard artwork, drawn in the case type's severity hue. */
const HAZARD_GLYPHS: Readonly<Record<CzHazardKind, LucideIcon>> = {
  flood: Waves,
  fire: Flame,
  obstruction: TreePine,
  outage: ZapOff,
  landslide: Mountain,
};

/**
 * One hazard report row (RenderHazardCard.tsx): a 112 px white card with a 1 px hairline, a
 * 49 px circle tinted ~8% in the severity hue, the type, a two-line note, the distance and
 * time meta, and a #9CA3AF chevron. Severity hues are fixed; nothing here follows the brand.
 * The card is a grid (icon | text column | chevron), so the text needs no wrapper of its own.
 */
export function HazardCard({ hazard }: { readonly hazard: CzHazard }): ReactNode {
  return (
    <span className="rx-citizen-hazard" style={rStyle({ '--rx-citizen-hue': hazard.hue })}>
      <span className="rx-citizen-hazard__icon">
        <RGlyph icon={HAZARD_GLYPHS[hazard.kind]} size={26} />
      </span>
      <span className="rx-citizen-hazard__type">{hazard.type}</span>
      <span className="rx-citizen-hazard__note">{hazard.note}</span>
      <span className="rx-citizen-hazard__meta">
        <span className="rx-citizen-hazard__metaitem">
          <RGlyph icon={MapPin} size={14} />
          {`${hazard.distance} away`}
        </span>
        <span className="rx-citizen-hazard__metaitem">
          <RGlyph icon={Clock} size={14} />
          {`${hazard.time} • ${hazard.ago}`}
        </span>
      </span>
      <RGlyph icon={ChevronRight} size={20} className="rx-citizen-hazard__chev" />
    </span>
  );
}
