import { ChevronRight, MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { RGlyph, rStyle } from '@/components/replicas/kit';
import { czBrief } from '@/components/replicas/citizen/sample-data';
import { DefensightAvatar } from './defensight-mark';

/** Severity accents of the brief (0–5); the sample brief is severity 2. Fixed, never brand. */
const SEVERITY_ACCENT = ['#16a34a', '#eab308', '#f97316', '#ef4444', '#dc2626', '#be123c'] as const;

/**
 * The Defensight AI Safety Brief (SensorWeatherPanel WeatherBriefCard): a card tinted 6% in
 * the severity accent with a 16% border, the Defensight avatar (brand accent, severity spark),
 * an EN / FIL toggle filled with the brand primary, the headline, body, accent-dot tips, the
 * "Ask about conditions" button and the 9 px disclaimer.
 */
export function SafetyBriefCard(): ReactNode {
  const accent = SEVERITY_ACCENT[czBrief.severity] ?? SEVERITY_ACCENT[0];
  return (
    <div className="rx-citizen-brief" style={rStyle({ '--rx-citizen-sev': accent })}>
      <span className="rx-citizen-brief__head">
        <DefensightAvatar size={26} sparkColor={accent} />
        <span className="rx-citizen-brief__title">{czBrief.title}</span>
        <span className="rx-citizen-brief__lang">
          {czBrief.languages.map((language, index) => (
            <span key={language} className="rx-citizen-brief__opt" data-on={index === 0 ? '' : undefined}>
              {language}
            </span>
          ))}
        </span>
      </span>
      <span className="rx-citizen-brief__headline">{czBrief.headline}</span>
      <span className="rx-citizen-brief__body">{czBrief.body}</span>
      <span className="rx-citizen-brief__tips">
        {czBrief.tips.map((tip) => (
          <span key={tip} className="rx-citizen-brief__tip">
            {tip}
          </span>
        ))}
      </span>
      <span className="rx-citizen-brief__ask">
        <RGlyph icon={MessageCircle} size={13} />
        <span className="rx-citizen-brief__ask-label">{czBrief.ask}</span>
        <RGlyph icon={ChevronRight} size={12} strokeWidth={2.5} />
      </span>
      <span className="rx-citizen-brief__note">{czBrief.disclaimer}</span>
    </div>
  );
}
