import { Bot } from 'lucide-react';
import type { ReactNode } from 'react';
import { RLineChart } from '@/components/replicas/kit';
import { smeChat, smeForecast, smeRestock } from '@/components/replicas/sme/sample-data';
import { AI_COPY } from './ai-copy';
import { AiAction } from './ai-action';
import { AiCard, AiSurface } from './ai-card';
import { SectionTitle } from './ai-screen';
import { InsightText } from './insight-text';
import { RestockRow } from './restock-row';
import { StatTile } from './stat-tile';

/*
 * The AI Assistant hub further down (ai.tsx, ForecastSection): Restock, Sales forecast and Ask AI.
 * The phone does the math and draws it; the model narrates only when asked, so the cards show the
 * computed line, with "Get AI advice" and "Explain forecast" waiting below them.
 */

export interface HubSectionProps {
  /** The section opens the visible slice (no 28 px gap above its title). */
  readonly first?: boolean;
}

/** Restock: the flagged items (on-device math), the computed advice line and "Get AI advice". */
export function RestockSection({ first }: HubSectionProps): ReactNode {
  return (
    <>
      <SectionTitle first={first}>{AI_COPY.restockSection}</SectionTitle>
      <AiSurface pad={16} className="rx-sme-ai-stock-list">
        {smeRestock.rows.map((row) => (
          <RestockRow key={row.name} row={row} />
        ))}
      </AiSurface>
      <AiCard label={AI_COPY.restockLabel} icon={Bot}>
        <InsightText>{smeRestock.summary}</InsightText>
      </AiCard>
      <AiAction label={AI_COPY.getAdvice} style={{ marginTop: 4 }} />
    </>
  );
}

/** Sales forecast: history and the least-squares projection, three stat tiles, the computed line and "Explain forecast". */
export function ForecastSection({ first }: HubSectionProps): ReactNode {
  return (
    <>
      <SectionTitle first={first}>{AI_COPY.forecastSection}</SectionTitle>
      <AiSurface pad={16} className="rx-sme-ai-chart">
        <span className="rx-sme-ai-legend">
          <span className="rx-sme-ai-legend__item">
            <span className="rx-sme-ai-legend__solid" />
            {AI_COPY.historyLegend}
          </span>
          <span className="rx-sme-ai-legend__item">
            <span className="rx-sme-ai-legend__dash" />
            {AI_COPY.projectedLegend}
          </span>
        </span>
        <RLineChart
          history={smeForecast.history}
          projected={smeForecast.projected}
          color="var(--rx-sme-ai-accent)"
          projColor="var(--rx-sme-ai-projection)"
          height={180}
          yLabels={smeForecast.yLabels}
          xLabels={smeForecast.xLabels}
        />
      </AiSurface>
      <span className="rx-sme-ai-stats">
        {smeForecast.tiles.map((tile) => (
          <StatTile key={tile.id} tile={tile} />
        ))}
      </span>
      <AiCard label={AI_COPY.forecastLabel} icon={Bot}>
        <InsightText>{smeForecast.summary}</InsightText>
      </AiCard>
      <AiAction label={AI_COPY.explainForecast} style={{ marginTop: 4 }} />
    </>
  );
}

/** Ask AI: the button that opens the chat sheet (1.8), and the grounding line under it. */
export function AskSection(): ReactNode {
  return (
    <>
      <SectionTitle>{AI_COPY.askSection}</SectionTitle>
      <AiAction label={AI_COPY.askAbout} />
      <span className="rx-sme-ai-disclaimer">{smeChat.subtitle}</span>
    </>
  );
}
