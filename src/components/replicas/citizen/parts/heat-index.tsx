import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, RSegmentBar } from '@/components/replicas/kit';
import { czHeatIndex, heatIndexPercent } from '@/components/replicas/citizen/sample-data';

/**
 * The station card's PAGASA heat-index section (SensorWeatherPanel HeatIndexBar): the reading,
 * the four fixed bands at flex 5/9/10/9 with a white marker ringed in the level colour, the
 * band ticks, and the advisory card with its 3 px left rule. Band and advisory colours are
 * official thresholds, so they never follow the brand.
 */
export function HeatIndex(): ReactNode {
  const { level } = czHeatIndex;
  return (
    <div className="rx-citizen-hi">
      <span className="rx-citizen-hi__row">
        <span className="rx-citizen-hi__label">Heat Index</span>
        <span className="rx-citizen-hi__value">{czHeatIndex.label}</span>
      </span>
      <RSegmentBar
        className="rx-citizen-hi__bar"
        segments={czHeatIndex.segments}
        ticks={czHeatIndex.segments.map((segment) => segment.tick)}
        marker={{ at: heatIndexPercent(), color: level.bar }}
      />
      <span className="rx-citizen-hi__advisory">
        <RGlyph icon={TriangleAlert} size={14} className="rx-citizen-hi__alert" />
        <span className="rx-citizen-hi__copy">
          <span className="rx-citizen-hi__level">{level.label}</span>
          <span className="rx-citizen-hi__text">{level.advisory}</span>
        </span>
      </span>
    </div>
  );
}
