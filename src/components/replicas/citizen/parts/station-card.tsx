import { ChevronRight, Droplets, MapPin, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph } from '@/components/replicas/kit';
import { czStation } from '@/components/replicas/citizen/sample-data';
import { HeatIndex } from './heat-index';
import { SafetyBriefCard } from './safety-brief-card';

/** A collapsed accordion row of the station card (AIR QUALITY, ENVIRONMENT). */
function AccordionRow({ label, dot, pill }: { readonly label: string; readonly dot: string; readonly pill?: string }): ReactNode {
  return (
    <span className="rx-citizen-acc">
      <span className="rx-citizen-acc__dot" style={{ background: dot }} />
      <span className="rx-citizen-acc__label">{label}</span>
      {pill ? <span className="rx-citizen-acc__pill">{pill}</span> : null}
      <RGlyph icon={ChevronRight} size={14} className="rx-citizen-acc__chev" />
    </span>
  );
}

/**
 * The LGU weather-station card on Home (SensorWeatherPanel SensorCard + WeatherContent): the
 * station header with its LIVE pill and the brand-tinted picker tile, the one-row hero
 * (temperature, heat index, AQI, humidity and wind chips), the two collapsed accordions, the
 * heat-index gauge and the Defensight safety brief. Readings and their colours are fixed; only
 * the picker tile and the brief's avatar and toggle follow the brand.
 */
export function StationCard(): ReactNode {
  const { wind } = czStation;
  return (
    <div className="rx-citizen-station">
      <span className="rx-citizen-station__head">
        <span className="rx-citizen-station__dot" />
        <span className="rx-citizen-station__id">
          <span className="rx-citizen-station__name">{czStation.name}</span>
          <span className="rx-citizen-station__addr">
            <RGlyph icon={MapPin} size={9} />
            <span>{czStation.address}</span>
          </span>
        </span>
        <span className="rx-citizen-live">{czStation.status}</span>
        <span className="rx-citizen-station__pick">
          <RGlyph icon={ChevronRight} size={13} strokeWidth={2.5} />
        </span>
      </span>
      <span className="rx-citizen-rule" />
      <span className="rx-citizen-hero">
        <span className="rx-citizen-hero__temp">
          <span className="rx-citizen-hero__deg">{czStation.temperature}</span>
          <span className="rx-citizen-hero__unit">°C</span>
        </span>
        <span className="rx-citizen-hero__mid">
          <span className="rx-citizen-hero__hi">{czStation.heatIndexLine}</span>
          <span className="rx-citizen-hero__aqi">{`AQI · ${czStation.aqi}`}</span>
        </span>
        <span className="rx-citizen-chip" data-tone="humidity">
          <RGlyph icon={Droplets} size={10} />
          <span className="rx-citizen-chip__stack">
            <span className="rx-citizen-chip__cap">Humidity</span>
            <span className="rx-citizen-chip__val">{czStation.humidity}</span>
          </span>
        </span>
        <span className="rx-citizen-chip" data-tone="wind">
          <RGlyph icon={Wind} size={10} />
          <span className="rx-citizen-chip__val">{wind.speed}</span>
          <span className="rx-citizen-chip__unit">{wind.unit}</span>
          <span className="rx-citizen-chip__unit">{wind.direction}</span>
        </span>
      </span>
      <span className="rx-citizen-rule" />
      <AccordionRow label="Air Quality" dot="#22c55e" pill={czStation.aqi} />
      <span className="rx-citizen-rule" />
      <AccordionRow label="Environment" dot="#8b5cf6" />
      <span className="rx-citizen-rule" />
      <HeatIndex />
      <SafetyBriefCard />
    </div>
  );
}
