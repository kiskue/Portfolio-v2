import { Package, ShoppingBag, ShoppingCart, TrendingUp, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { pickState, RAutoScroll, RStack, type ReplicaProps } from '@/components/replicas/kit';
import { DashHeader } from '@/components/replicas/sme/core/parts/dash-header';
import { KpiCard } from '@/components/replicas/sme/core/parts/kpi-card';
import { OwnerTopBar } from '@/components/replicas/sme/core/parts/owner-top-bar';
import { SME } from '@/components/replicas/sme/core/parts/palette';
import { PeriodSelector } from '@/components/replicas/sme/core/parts/period-selector';
import { PnlCard } from '@/components/replicas/sme/core/parts/pnl-card';
import { SalesTargetCard } from '@/components/replicas/sme/core/parts/sales-target-card';
import { SplitCard } from '@/components/replicas/sme/core/parts/split-card';
import { StatTile } from '@/components/replicas/sme/core/parts/stat-tile';
import { smeDashboard } from '@/components/replicas/sme/sample-data';
import type { FigureState } from '@/content/apps/figures';

type DashState = FigureState<'1.1'>;

const STATES = ['kpis', 'pnl'] as const satisfies readonly DashState[];

/**
 * How far the content scrolls. kpis: the top of the screen at rest; while active it scrolls
 * 320 px from the KPI grid to the P&L card (design §5.3: 1.6 s from +0.8 s). pnl: scrolled until
 * the whole P&L card is in view, down to NET PROFIT, with the channel tiles above it.
 */
const SCROLL: Readonly<Record<DashState, { readonly distance: number; readonly poster: 'start' | 'end' }>> = {
  kpis: { distance: 320, poster: 'start' },
  pnl: { distance: 420, poster: 'end' },
};

type KpiId = (typeof smeDashboard.kpis)[number]['id'];
type ChannelId = (typeof smeDashboard.channels)[number]['id'];

const KPI_LOOK: Readonly<Record<KpiId, { readonly icon: LucideIcon; readonly accent: string }>> = {
  'gross-income': { icon: TrendingUp, accent: SME.green },
  'products-sold': { icon: ShoppingBag, accent: SME.navy },
  'gross-profit': { icon: TrendingUp, accent: SME.green },
  cogs: { icon: Package, accent: SME.error400 },
};

const CHANNEL_LOOK: Readonly<Record<ChannelId, { readonly icon: LucideIcon; readonly accent: string }>> = {
  'in-store': { icon: ShoppingCart, accent: SME.navy },
  online: { icon: ShoppingBag, accent: SME.green },
};

/** Two KPI cards side by side. */
function KpiRow({ ids }: { readonly ids: readonly KpiId[] }): ReactNode {
  return (
    <RStack dir="row" gap={12}>
      {smeDashboard.kpis
        .filter((kpi) => ids.includes(kpi.id))
        .map((kpi) => (
          <KpiCard key={kpi.id} label={kpi.label} value={kpi.value} {...KPI_LOOK[kpi.id]} />
        ))}
    </RStack>
  );
}

/**
 * FIG 1.1, the owner dashboard (sme-app.json owner-dashboard): the navy TopNavBar with the
 * wordmark, then the scrolling page: greeting, period selector, the 2×2 KPI grid, the in-store
 * and online tiles, Total Orders | Units Produced, the P&L waterfall and the sales target.
 * Every figure is the shared month in sample-data (₱48,250 revenue, ₱10,170 net profit).
 */
export function OwnerDashboard({ state }: ReplicaProps): ReactNode {
  const scroll = SCROLL[pickState(STATES, state)];
  return (
    <RStack className="rx-sme-screen" bg={SME.canvas}>
      <OwnerTopBar />
      <RAutoScroll distance={scroll.distance} startMs={800} durationMs={1600} poster={scroll.poster} style={{ flex: 1 }}>
        <RStack pad={[12, 16, 32]}>
          <DashHeader />
          <RStack gap={16}>
            <PeriodSelector />
            <RStack gap={12}>
              <KpiRow ids={['gross-income', 'products-sold']} />
              <KpiRow ids={['gross-profit', 'cogs']} />
            </RStack>
            <RStack dir="row" gap={12}>
              {smeDashboard.channels.map((channel) => (
                <StatTile key={channel.id} label={channel.label} value={channel.value} sub={channel.sub} {...CHANNEL_LOOK[channel.id]} />
              ))}
            </RStack>
            <SplitCard />
            <PnlCard />
            <SalesTargetCard />
          </RStack>
        </RStack>
      </RAutoScroll>
    </RStack>
  );
}
