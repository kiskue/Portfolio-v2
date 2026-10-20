import type { ReactNode } from 'react';
import { RBarPairs, RCanvas, RCard, RLineChart, RStack, RText } from '@/components/replicas/kit';
import { smeDashboard, smeForecast } from '@/components/replicas/sme/sample-data';
import { PhoneFrame } from '@/components/showcase/phone-frame';
import { DevMapSection, PhoneItem, PhoneRow } from './dev-map-section';

/** The SME chart colours per theme (ForecastSection and the dashboard TrendChart). */
const PALETTE = {
  light: { line: '#1E4D8C', projection: '#1E4D8C80', sales: '#27AE60', costs: '#FF5C55' },
  dark: { line: '#4F9EFF', projection: 'rgba(79,158,255,0.55)', sales: '#27AE60', costs: '#FF5C55' },
} as const;

function ChartCard({ title, children }: { readonly title: string; readonly children: ReactNode }): ReactNode {
  return (
    <RCard radius={16} border="faint" pad={14} bg="var(--rx-surface)">
      <RText size={13} weight={600} style={{ marginBottom: 10 }}>
        {title}
      </RText>
      {children}
    </RCard>
  );
}

/** The 1.7 forecast and 1.1 bars as the app draws them, then the edge cases. */
function ChartScreen({ theme }: { readonly theme: 'light' | 'dark' }): ReactNode {
  const colors = PALETTE[theme];
  const weeks = smeDashboard.salesVsCosts;
  return (
    <RStack gap={10} pad={[56, 12, 12]}>
      <ChartCard title="Sales forecast (1.7)">
        <RLineChart
          history={smeForecast.history}
          projected={smeForecast.projected}
          color={colors.line}
          projColor={colors.projection}
          height={180}
          yLabels={smeForecast.yLabels}
          xLabels={smeForecast.xLabels}
        />
      </ChartCard>
      <RStack dir="row" gap={10}>
        <ChartCard title="Sales vs Costs (1.1)">
          <RBarPairs pairs={weeks.pairs} colors={[colors.sales, colors.costs]} height={80} labels={weeks.labels} />
        </ChartCard>
        <ChartCard title="6 pairs, a zero">
          <RBarPairs
            pairs={[
              [12, 9],
              [0, 4],
              [15, 15],
              [7, 11],
              [3, 1],
              [9, 6],
            ]}
            colors={[colors.sales, colors.costs]}
            height={60}
            labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
            barWidth={6}
            gap={3}
          />
        </ChartCard>
      </RStack>
      <RStack dir="row" gap={10}>
        <ChartCard title="History only, data range">
          <RLineChart
            history={[1400, 1650, 1520, 1810, 2100, 1760, 1990]}
            color={colors.line}
            projColor={colors.projection}
            height={90}
            yLabels={['High', 'Mid', 'Low']}
            xLabels={['Mon', 'Wed', 'Fri', 'Sun']}
            labelWidth={34}
          />
        </ChartCard>
        <ChartCard title="Two points, explicit range">
          <RLineChart
            history={[2]}
            projected={[5]}
            color={colors.line}
            projColor={colors.projection}
            height={90}
            yLabels={['10', '5', '0']}
            xLabels={['1', '+1']}
            labelWidth={24}
            dots={false}
          />
        </ChartCard>
      </RStack>
      <RevealCard theme={theme} />
    </RStack>
  );
}

/** Charts that draw in while active (glimpses); the poster is fully drawn. */
function RevealCard({ theme }: { readonly theme: 'light' | 'dark' }): ReactNode {
  const colors = PALETTE[theme];
  return (
    <ChartCard title="Reveal while active (poster: drawn)">
      <RStack dir="row" gap={12} align="end">
        <RLineChart
          history={smeForecast.history.slice(-8)}
          projected={smeForecast.projected.slice(0, 6)}
          color={colors.line}
          projColor={colors.projection}
          height={80}
          yLabels={['₱3,200', '₱2,000']}
          xLabels={['1', '8', '+6']}
          labelWidth={40}
          reveal={{ startMs: 200, durationMs: 900 }}
          style={{ flex: 1 }}
        />
        <RBarPairs
          pairs={smeDashboard.salesVsCosts.pairs}
          colors={[colors.sales, colors.costs]}
          height={80}
          labels={smeDashboard.salesVsCosts.labels}
          reveal={{ startMs: 300, durationMs: 700 }}
          style={{ width: 'auto' }}
        />
      </RStack>
    </ChartCard>
  );
}

/** The reveal charts alone on an SME canvas, for the motion lab. */
export function ChartRevealPhone(): ReactNode {
  return (
    <PhoneFrame size="lg" chrome="device" statusBar="dark" label="Replica charts that draw in while active. Fictional data.">
      <RCanvas app="sme" theme="light">
        <RStack gap={10} pad={[56, 12, 12]}>
          <RevealCard theme="light" />
        </RStack>
      </RCanvas>
    </PhoneFrame>
  );
}

/** Section 5: every chart case in both SME themes. */
export function ChartGallery(): ReactNode {
  return (
    <DevMapSection
      id="charts"
      title="5. Charts"
      intro={
        <>
          RLineChart and RBarPairs are deterministic SVG with tabular labels. The forecast uses the shared SME sample data
          (y range read from its labels, x labels placed by day: “6” is day 6, “+7” a week past the last day), and the bars use
          the dashboard’s weekly sales and costs at the card’s 80 px height. Below are the edge cases: no projection, two
          points, unparsed labels (evenly spread), a zero value and a draw-in reveal for glimpses.
        </>
      }
    >
      <PhoneRow label="Charts in both themes">
        {(['light', 'dark'] as const).map((theme) => (
          <PhoneItem key={theme} caption={`Charts · ${theme}`} data-charts={theme}>
            <PhoneFrame
              size="2xl"
              chrome="device"
              statusBar={theme === 'dark' ? 'light' : 'dark'}
              homeIndicator={theme === 'dark' ? 'light' : 'dark'}
              label={`Replica charts in the ${theme} theme: the sales forecast and the sales versus costs bars. Fictional data.`}
            >
              <RCanvas app="sme" theme={theme}>
                <ChartScreen theme={theme} />
              </RCanvas>
            </PhoneFrame>
          </PhoneItem>
        ))}
      </PhoneRow>
    </DevMapSection>
  );
}
