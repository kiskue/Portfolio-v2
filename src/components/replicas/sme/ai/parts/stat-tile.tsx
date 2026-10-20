import { Rocket, TrendingUp, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { RIconChip } from '@/components/replicas/kit';
import { smeForecast } from '@/components/replicas/sme/sample-data';

type ForecastTile = (typeof smeForecast.tiles)[number];

const TILE_ICON = { average: Wallet, 'next-30': Rocket } as const;

/**
 * The compact StatTile under the forecast chart: radius 24, 12 px padding, 6 px gaps; a 34 px
 * chip tinted 10% (Wallet, Rocket; layoutSpec), or for Trend a 22 px green TrendingUp pill; the
 * value 18 px bold in the accent and the label 12 px medium, each on one line with an ellipsis.
 */
export function StatTile({ tile }: { readonly tile: ForecastTile }): ReactNode {
  return (
    <span className="rx-sme-ai-stat">
      <span className="rx-sme-ai-stat__top">
        {tile.id === 'trend' ? (
          <RIconChip icon={TrendingUp} color="var(--rx-sme-green)" size={22} shape="circle" iconSize={12} />
        ) : (
          <RIconChip icon={TILE_ICON[tile.id]} color="var(--rx-sme-ai-accent)" size={34} radius={11} shape="square" iconSize={16} />
        )}
      </span>
      <span className="rx-sme-ai-stat__value">{tile.value}</span>
      <span className="rx-sme-ai-stat__label">{tile.label}</span>
    </span>
  );
}
