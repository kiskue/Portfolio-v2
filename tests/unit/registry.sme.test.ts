import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { replicas } from '@/components/replicas/registry';
import { smeReplicas } from '@/components/replicas/sme';
import { smeAiReplicas } from '@/components/replicas/sme/ai';
import { smeCoreReplicas } from '@/components/replicas/sme/core';
import { SME_LOGO_FONT_PX, SME_LOGO_ICON_PX, SME_LOGO_SIZES, SmeLogo, type SmeLogoVariant } from '@/components/replicas/sme/parts/sme-logo';
import {
  SME_CATALOG_SIZE,
  SME_OWNER_NOTIFICATIONS,
  percent,
  peso,
  smeCartTotal,
  smeCartUnits,
  smeChat,
  smeCustomers,
  smeDashboard,
  smeDelivery,
  smeForecast,
  smeInsight,
  smeLedger,
  smeMonth,
  smeOwner,
  smePos,
  smePriceTier,
  smeProduct,
  smeProducts,
  smeRestock,
  smeRoi,
  smeStockLabel,
  smeStorefront,
  smeToday,
  type SmeRichText,
} from '@/components/replicas/sme/sample-data';
import { figures } from '@/content/apps/figures';

/*
 * The SME replicas' shared foundations: the core / ai split of the registry, the app tokens in
 * sme.css, the ONE shared sample dataset (every total, margin, forecast and cross-figure
 * mention is re-derived here) and the SmeLogo port.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SME_DIR = join(ROOT, 'src/components/replicas/sme');
const read = (path: string): string => readFileSync(path, 'utf8');
const rel = (path: string): string => relative(ROOT, path).replaceAll('\\', '/');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const mean = (values: readonly number[]): number => sum(values) / values.length;
const flatten = (text: SmeRichText): string => text.map((part) => (typeof part === 'string' ? part : part.strong)).join('');

// ─── Registry split ──────────────────────────────────────────────────────────────────────

describe('SME registry split: core 1.1–1.5, ai 1.6–1.9', () => {
  const smeIds = figures.filter((figure) => figure.app === 'sme').map((figure) => figure.id);

  it('core holds 1.1–1.5 and ai holds 1.6–1.9', () => {
    expect(Object.keys(smeCoreReplicas)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5']);
    expect(Object.keys(smeAiReplicas)).toEqual(['1.6', '1.7', '1.8', '1.9']);
  });

  it('the halves are disjoint and together hold every SME figure in figures.ts', () => {
    const core = Object.keys(smeCoreReplicas);
    const ai = Object.keys(smeAiReplicas);
    expect(core.filter((id) => ai.includes(id))).toEqual([]);
    expect([...core, ...ai].sort()).toEqual([...smeIds].sort());
  });

  it('smeReplicas and the registry hand out each half’s components unchanged', () => {
    const halves: Readonly<Record<string, unknown>> = { ...smeCoreReplicas, ...smeAiReplicas };
    const merged: Readonly<Record<string, unknown>> = smeReplicas;
    const registry: Readonly<Record<string, unknown>> = replicas;
    for (const [id, component] of Object.entries(halves)) {
      expect(merged[id], id).toBe(component);
      expect(registry[id], id).toBe(component);
    }
  });

  it('imports sme.css exactly once, from sme/index.ts', () => {
    const importsCss = /^\s*import\s+['"][^'"]*\bsme\.css['"]/m;
    const importers = sourceFiles(join(ROOT, 'src')).filter((file) => importsCss.test(read(file)));
    expect(importers.map(rel)).toEqual(['src/components/replicas/sme/index.ts']);
    expect(read(join(SME_DIR, 'index.ts')).match(new RegExp(importsCss.source, 'gm'))).toHaveLength(1);
  });
});

// ─── sme.css ─────────────────────────────────────────────────────────────────────────────

interface CssBlock {
  readonly selector: string;
  readonly vars: ReadonlyMap<string, string>;
}

/** The rule blocks inside `@layer components { … }` (comments stripped). */
function componentBlocks(css: string): { readonly outside: string; readonly blocks: readonly CssBlock[] } {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = clean.indexOf('@layer components {');
  let depth = 0;
  let end = -1;
  for (let index = clean.indexOf('{', start); index < clean.length; index += 1) {
    if (clean[index] === '{') depth += 1;
    if (clean[index] === '}') depth -= 1;
    if (depth === 0) {
      end = index;
      break;
    }
  }
  const inner = clean.slice(clean.indexOf('{', start) + 1, end);
  const blocks = [...inner.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
    (match): CssBlock => ({
      selector: (match[1] ?? '').trim(),
      vars: new Map([...(match[2] ?? '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((decl) => [decl[1] ?? '', (decl[2] ?? '').trim()])),
    }),
  );
  return { outside: `${clean.slice(0, start)}${clean.slice(end + 1)}`.trim(), blocks };
}

describe('sme.css: the SME app tokens', () => {
  const css = read(join(SME_DIR, 'sme.css'));
  const { outside, blocks } = componentBlocks(css);
  const light = blocks.find((block) => block.selector === '.rx-canvas[data-app="sme"]');
  const dark = blocks.find((block) => block.selector === '.rx-canvas[data-app="sme"][data-theme="dark"]');

  it('keeps everything in @layer components and pins Tailwind’s layer order', () => {
    expect(outside).toBe('@layer properties, theme, base, components, utilities;');
    expect(blocks.map((block) => block.selector)).toEqual(['.rx-canvas[data-app="sme"]', '.rx-canvas[data-app="sme"][data-theme="dark"]']);
  });

  it('declares only --rx-sme-* custom properties (never kit, brand or Tailwind names)', () => {
    for (const block of blocks) {
      for (const name of block.vars.keys()) expect(name, block.selector).toMatch(/^--rx-sme-[a-z0-9-]+$/);
    }
  });

  it('has the light set and the AI dark set (#0F0F14 / #151A27 / #1E2435 / #4F9EFF)', () => {
    expect(light?.vars.get('--rx-sme-navy')).toBe('#1e4d8c');
    expect(light?.vars.get('--rx-sme-green')).toBe('#27ae60');
    expect(light?.vars.get('--rx-sme-amber')).toBe('#f5a623');
    expect(light?.vars.get('--rx-sme-ai-canvas')).toBe('#f2f5fa');
    expect(dark?.vars.get('--rx-sme-ai-canvas')).toBe('#0f0f14');
    expect(dark?.vars.get('--rx-sme-ai-card')).toBe('#151a27');
    expect(dark?.vars.get('--rx-sme-ai-raised')).toBe('#1e2435');
    expect(dark?.vars.get('--rx-sme-ai-accent')).toBe('#4f9eff');
    expect(dark?.vars.get('--rx-sme-theme-bg')).toBe('#0c1322');
  });

  it('flips only tokens the light set declares (a dark-only name would be undefined in light)', () => {
    const lightNames = new Set(light?.vars.keys() ?? []);
    expect([...(dark?.vars.keys() ?? [])].filter((name) => !lightNames.has(name))).toEqual([]);
  });

  it('declares no animation (the motion contract lives in replica.css)', () => {
    expect(css).not.toMatch(/@keyframes|animation\s*:/);
  });
});

// ─── Sample data ─────────────────────────────────────────────────────────────────────────

describe('SME sample data: formatting', () => {
  it('prints pesos the way the app does', () => {
    expect(peso(48250)).toBe('₱48,250.00');
    expect(peso(48250, 0)).toBe('₱48,250');
    expect(peso(190)).toBe('₱190.00');
    expect(peso(2580.555, 0)).toBe('₱2,581');
    expect(peso(1234567.5)).toBe('₱1,234,567.50');
    expect(peso(-640)).toBe('-₱640.00');
  });

  it('prints percentages the way the app does', () => {
    expect(percent(72)).toBe('72%');
    expect(percent(18.5, 1, true)).toBe('+18.5%');
    expect(percent(-3.25, 1, true)).toBe('-3.3%');
  });
});

describe('SME sample data: this month (₱48,250 revenue, ₱10,170 net profit)', () => {
  const m = smeMonth;
  const operating = m.utilities + m.overhead;

  it('adds up from revenue to net profit', () => {
    expect([m.revenue, m.cogs, m.grossProfit, m.netProfit]).toEqual([48250, 28380, 19870, 10170]);
    expect(m.inStore.revenue + m.online.revenue).toBe(m.revenue);
    expect(m.inStore.orders + m.online.orders).toBe(m.orders);
    expect(m.ingredientCost + m.rawMaterialCost).toBe(m.cogs);
    expect(m.ingredientWaste).toBeLessThan(m.ingredientCost);
    expect(m.revenue - m.cogs).toBe(m.grossProfit);
    expect(m.grossProfit - operating).toBe(m.netProfit);
    expect(m.unitsProduced).toBeGreaterThanOrEqual(m.productsSold);
  });

  it('is the dashboard (1.1): KPIs, channels, split, P&L and target', () => {
    expect(smeDashboard.greeting).toBe(smeOwner.greeting);
    expect(smeDashboard.date).toBe('Monday, October 19, 2026');
    expect(smeDashboard.notifications).toBe(SME_OWNER_NOTIFICATIONS);
    expect(smeDashboard.kpis.map((kpi) => kpi.value)).toEqual(['₱48,250.00', '1,284', '₱19,870.00', '₱28,380.00']);
    expect(smeDashboard.channels.map((channel) => [channel.value, channel.sub])).toEqual([
      ['₱36,900.00', '412 orders'],
      ['₱11,350.00', '57 orders'],
    ]);
    expect(smeDashboard.split.map((item) => item.value)).toEqual(['469', '1,350']);
    expect(smeDashboard.pnl.title).toBe(`P&L Summary — ${smeToday.month}`);
    expect(smeDashboard.pnl.rows.map((row) => [row.kind, row.label, 'amount' in row ? row.amount : null])).toEqual([
      ['income', 'Gross Income', '₱48,250.00'],
      ['section', 'COGS (Cost of Goods Sold)', null],
      ['cost', 'Ingredient Cost', '₱21,040.00'],
      ['waste', '· Waste', '₱640.00'],
      ['cost', 'Raw Material Cost', '₱7,340.00'],
      ['subtotal', 'Gross Profit', '₱19,870.00'],
      ['section', 'Operating Expenses', null],
      ['cost', 'Utilities', '₱3,200.00'],
      ['cost', 'Overhead', '₱6,500.00'],
      ['total', 'NET PROFIT', '₱10,170.00'],
    ]);
    expect(smeDashboard.pnl.rows[0]).toMatchObject({ note: 'from 469 completed orders' });
    expect(smeDashboard.target).toEqual({ sold: '₱1,800.00', target: '₱2,500.00', percent: 72, summary: '72% of ₱2,500.00 today' });
    expect(smeDashboard.roiOutlook.insight).toContain('41.2%');
  });

  it('is quoted identically wherever a figure says "this month" (1.6, 1.7, 1.8)', () => {
    const revenue = peso(m.revenue, 0);
    const net = peso(m.netProfit, 0);
    const salesAnswer = smeChat.thread[1]?.text ?? '';
    for (const text of [smeInsight.computed, smeInsight.enhanced, salesAnswer]) {
      expect(text).toContain(revenue);
      expect(text).toContain(net);
    }
    expect(smeInsight.computed).toBe('This month: ₱48,250 in revenue and ₱10,170 in net profit.');
    expect(smeForecast.narrative).toContain(revenue);
    // The AI dossier's contradicting net profit must never come back.
    expect(JSON.stringify({ smeInsight, smeChat, smeForecast, smeDashboard, smeRoi })).not.toMatch(/9,830|54,321/);
  });

  it('derives every margin and share the AI copy states', () => {
    expect(smeInsight.enhanced).toContain(`a ${percent((m.netProfit / m.revenue) * 100)} margin`);
    expect(smeInsight.enhanced).toContain(`${percent((m.online.revenue / m.revenue) * 100)} of sales`);
    expect(flatten(smeInsight.report[1] ?? [])).toBe(`Cost pressure: utilities and overhead come to ${peso(operating, 0)} this month.`);
    expect(flatten(smeInsight.report[3] ?? [])).toBe('Watch: net margin is 21%, close to the 20% caution line.');
    expect(smeDashboard.roiOutlook.insight).toContain(percent((m.grossProfit / m.revenue) * 100, 1));
  });
});

describe('SME sample data: forecast (1.7) and the weekly bars (1.1)', () => {
  const history = smeForecast.history;
  const xs = history.map((_, index) => index);
  const slope = sum(xs.map((x, index) => (x - mean(xs)) * ((history[index] ?? 0) - mean(history)))) / sum(xs.map((x) => (x - mean(xs)) ** 2));
  const intercept = mean(history) - slope * mean(xs);
  const fit = (x: number): number => intercept + slope * x;

  it('draws October 1–18, which with today’s sales make the month', () => {
    expect(history).toHaveLength(18);
    expect(sum(history) + smeMonth.todaySales).toBe(smeMonth.revenue);
    expect(smeToday.monthDays).toBe(history.length + 1);
    // Every price is a multiple of ₱5, so every day's takings are too.
    for (const product of smeProducts) expect(product.price % 5).toBe(0);
    for (const value of history) expect(value % 5).toBe(0);
  });

  it('states the average, the trend and the least-squares projection it draws', () => {
    expect(smeForecast.averageDaily).toBeCloseTo(mean(history), 6);
    expect(smeForecast.trend).toBe(Number(((mean(history.slice(9)) / mean(history.slice(0, 9)) - 1) * 100).toFixed(1)));
    expect(smeForecast.projected).toEqual(Array.from({ length: 14 }, (_, k) => Math.round(fit(history.length + k))));
    expect(smeForecast.next30Days).toBe(Math.round(sum(Array.from({ length: 30 }, (_, k) => fit(history.length + k))) / 10) * 10);
    expect(smeForecast.tiles.map((tile) => tile.value)).toEqual(['₱2,581', '₱88,640', '+6.2%']);
    expect(smeForecast.summary).toBe('₱2,581 average daily revenue, trending up 6.2% recently.');
  });

  it('fits every point inside the plotted range', () => {
    const values = [...history, ...smeForecast.projected];
    expect(Math.min(...values)).toBeGreaterThanOrEqual(smeForecast.yMin);
    expect(Math.max(...values)).toBeLessThanOrEqual(smeForecast.yMax);
    expect(smeForecast.yLabels).toEqual(['₱3,200', '₱2,800', '₱2,400', '₱2,000']);
    expect(smeForecast.yLabels[0]).toBe(peso(smeForecast.yMax, 0));
    expect(smeForecast.yLabels.at(-1)).toBe(peso(smeForecast.yMin, 0));
  });

  it('splits the month by week for Sales vs Costs (costs = COGS + operating expenses)', () => {
    const { labels, pairs } = smeDashboard.salesVsCosts;
    expect(pairs).toHaveLength(labels.length);
    expect(pairs.map(([sales]) => sales)).toEqual([sum(history.slice(0, 7)), sum(history.slice(7, 14)), sum(history.slice(14)) + smeMonth.todaySales]);
    expect(sum(pairs.map(([, costs]) => costs))).toBe(smeMonth.cogs + smeMonth.utilities + smeMonth.overhead);
    for (const [sales, costs] of pairs) expect(costs).toBeLessThan(sales);
  });
});

describe('SME sample data: business ROI (1.1 card, 1.6 report, 1.9)', () => {
  it('is one set of figures', () => {
    expect(smeRoi.roiPercent).toBeCloseTo((smeRoi.netProfitAllTime / smeRoi.investment) * 100, 9);
    expect(smeRoi.card).toEqual({ roi: '+18.5%', netProfit: '₱55,500', breakeven: '64%', breakevenPercent: 64 });
    expect(Math.round((smeRoi.unitsSoldToDate / smeRoi.breakevenUnits) * 100)).toBe(smeRoi.card.breakevenPercent);
    expect(smeRoi.insight.medium).toBe(
      'Your business has earned ₱55,500 net profit on a ₱300,000 total investment — an ROI of 18.5%, within the healthy 15–30% SME range.',
    );
    expect(flatten(smeInsight.report[0] ?? [])).toBe('Profitability: ROI of 18.5% and ₱55,500 net profit all-time.');
    expect(smeRoi.netProfitAllTime).toBeGreaterThan(smeMonth.netProfit);
  });

  it('is Medium Risk by the app’s rule (ROI from 10% to under 25%, profitable), with a body for every 1.9 state', () => {
    expect(smeRoi.risk).toBe('medium');
    expect(smeRoi.roiPercent).toBeGreaterThanOrEqual(10);
    expect(smeRoi.roiPercent).toBeLessThan(25);
    const states = figures.find((figure) => figure.id === '1.9')?.states ?? [];
    expect(Object.keys(smeRoi.insight).sort()).toEqual([...states].sort());
  });

  it('credits the best performer at its catalog price', () => {
    const { product, unitsAllTime } = smeRoi.topProduct;
    expect(flatten(smeInsight.report[2] ?? [])).toBe(`Best performer: Ube Pandesal, ${peso(unitsAllTime * smeProduct(product).price, 0)} from 800 packs.`);
    expect(unitsAllTime).toBeLessThan(smeRoi.unitsSoldToDate);
  });
});

describe('SME sample data: one catalog (1.2, 1.4, 1.5, 1.7)', () => {
  it('has unique products at the research prices and stock', () => {
    expect(new Set(smeProducts.map((product) => product.id)).size).toBe(smeProducts.length);
    expect(new Set(smeProducts.map((product) => product.name)).size).toBe(smeProducts.length);
    expect(smeProducts.map((product) => [product.name, product.price, product.stock]).slice(0, 5)).toEqual([
      ['Ube Pandesal (10s)', 65, 48],
      ['Leche Flan Tub', 180, 12],
      ['Bibingka Party Tray', 550, 4],
      ['Calamansi Juice 500ml', 45, 0],
      ['Pancit Bihon Bilao', 450, 6],
    ]);
    expect(SME_CATALOG_SIZE).toBeGreaterThanOrEqual(smeProducts.length);
    expect(smePos.productCount).toBe(`${SME_CATALOG_SIZE} Products`);
  });

  it('prices tiers and stock pills the way the POS draws them', () => {
    expect([smePriceTier(550), smePriceTier(500), smePriceTier(499), smePriceTier(100), smePriceTier(99)]).toEqual(['indigo', 'indigo', 'navy', 'navy', 'green']);
    expect(smePriceTier(smeProduct('bibingka-tray').price)).toBe('indigo');
    expect(smeStockLabel(smeProduct('ube-pandesal'))).toBe('48 pcs');
    expect(smeStockLabel(smeProduct('calamansi-juice'))).toBe('Out of Stock');
  });

  it('shows the same stock everywhere: Calamansi Juice is out on POS, storefront and restock', () => {
    for (const id of [...smePos.grid, ...smeStorefront.grid, ...smeStorefront.favorites]) expect(() => smeProduct(id)).not.toThrow();
    expect(smePos.grid).toContain('calamansi-juice');
    expect(smeStorefront.grid).toContain('calamansi-juice');
    for (const row of smeRestock.rows) {
      if (row.product) expect(row.quantity, row.name).toBe(smeProduct(row.product).stock);
    }
    expect(smeRestock.rows.find((row) => row.product === 'calamansi-juice')).toMatchObject({ quantity: 0, badge: 'Out of Stock' });
    // Order #10482 took the last two bottles.
    expect(smeDelivery.items).toContainEqual({ product: 'calamansi-juice', qty: 2 });
  });

  it('never puts more in a cart than the shelf holds', () => {
    for (const line of [...smePos.cart, ...smeStorefront.cart]) {
      expect(line.qty, line.product).toBeLessThanOrEqual(smeProduct(line.product).stock);
      expect(smePos.grid.includes(line.product) || smeStorefront.grid.includes(line.product)).toBe(true);
    }
  });

  it('adds up the POS sale (₱310.00, ₱500.00 cash, ₱190.00 change)', () => {
    expect(smeCartTotal(smePos.cart)).toBe(310);
    expect(smeCartUnits(smePos.cart)).toBe(3);
    expect(smePos).toMatchObject({
      cartCount: '3 in cart',
      subtotal: '₱310.00',
      total: '₱310.00',
      checkoutSublabel: '3 items · ₱310.00',
      orderLine: 'Order #MGXK3Z2A-7QF · 3 items',
      itemsTitle: 'Order Items (3)',
      payment: 'cash',
      tendered: '₱500.00',
      change: 'Change: ₱190.00',
      confirm: 'Confirm Sale · ₱310.00',
    });
  });

  it('adds up the storefront cart and the delivery order', () => {
    expect(smeStorefront.cartLabel).toBe(`View Cart · 2 items · ${peso(smeCartTotal(smeStorefront.cart))}`);
    expect(smeStorefront.cartLabel).toBe('View Cart · 2 items · ₱245.00');
    expect(smeCartTotal(smeDelivery.items)).toBe(720);
    expect(smeDelivery.summary.at(-1)).toEqual([
      { label: 'Subtotal', value: '₱720.00' },
      { label: 'Delivery', value: 'FREE' },
      { label: 'Total', value: '₱720.00', emphasis: true },
    ]);
  });
});

describe('SME sample data: the delivery (1.5)', () => {
  it('goes to the storefront’s suki, with the trip and the remaining leg consistent', () => {
    const rows = new Map(smeDelivery.summary.flat().map((row) => [row.label, row.value]));
    expect(rows.get('Recipient')).toBe(`${smeStorefront.customer} S.`);
    expect(rows.get('Order Date')).toBe('Oct 19, 2026, 11:42 AM');
    expect(rows.get('Payment')).toBe('Pay Now');
    expect(smeStorefront.verification).toBe('Unverified');
    expect(smeDelivery.eta).toBe('2.4 km · ~7 min');
    expect(smeDelivery.riderLine).toBe('Motorcycle · 2.4 km · ~7 min');
    expect(Number.parseFloat(rows.get('Distance') ?? '')).toBeGreaterThan(2.4);
  });

  it('is out for delivery: done steps, then the one active step, then pending', () => {
    const states = smeDelivery.steps.map((step) => step.state);
    expect(states.filter((state) => state === 'active')).toHaveLength(1);
    expect(smeDelivery.steps.find((step) => step.state === 'active')?.label).toBe('Out for delivery');
    expect(states.join(' ')).toMatch(/^(done )+active( pending)*$/);
  });
});

describe('SME sample data: customers (1.3, 1.2, 1.8)', () => {
  it('adds up the ledger: ₱5,090.00 due, ₱300.00 in advances, 8 / 5 / 1 / 2', () => {
    expect(smeLedger.totalDue).toBe('₱5,090.00');
    expect(smeLedger.advancesHeld).toBe('₱300.00');
    expect(smeLedger.counts).toEqual({ all: 8, due: 5, advance: 1, paid: 2 });
    expect(smeLedger.rows).toHaveLength(smeCustomers.length);
  });

  it('ranks debtors by amount due, then the advance and the fully paid', () => {
    expect(smeLedger.rows.map((row) => [row.name, row.rank, row.medal, row.amountLabel, row.small])).toEqual([
      ['Mang Tonyo', '#1', 'gold', '₱2,450.00', false],
      ['Aling Rosa', '#2', 'silver', '₱1,180.00', false],
      ['Kuya Ben', '#3', 'bronze', '₱860.00', true],
      ['Nanay Cora', '#4', null, '₱420.00', true],
      ['Jun-Jun', '#5', null, '₱180.00', true],
      ['Ate Liza', null, null, 'Advance ₱300.00', false],
      ['Tess', null, null, 'FULLY PAID', false],
      ['Mario', null, null, 'FULLY PAID', false],
    ]);
    expect(smeLedger.rows[0]).toMatchObject({ paidShare: 23, stats: { credit: '₱3,200.00', paid: '₱750.00', due: '₱2,450.00' } });
    for (const row of smeLedger.rows) expect(row.paidShare).toBeLessThanOrEqual(100);
  });

  it('uses the ledger for the POS utang customer and the AI chat', () => {
    expect(smePos.utang).toEqual({ customer: 'mang-tonyo', name: 'Mang Tonyo', badge: 'Due ₱2,450.00' });
    const answer = smeChat.thread.find((message) => message.from === 'them' && message.text.includes('due'))?.text ?? '';
    expect(answer).toBe('Mang Tonyo, with ₱2,450 still due. In all, 5 customers owe ₱5,090.');
  });

  it('never carries a dialable number: phones are masked', () => {
    for (const customer of smeCustomers) expect(customer.phone).toMatch(/^09\d{2} ••• \d{4}$/);
    const everything = JSON.stringify({ smeCustomers, smeLedger, smePos, smeStorefront, smeDelivery, smeChat, smeInsight, smeRestock, smeForecast, smeRoi, smeDashboard });
    expect(everything).not.toMatch(/\b09\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|\+63/);
    expect(everything).not.toMatch(/@/);
  });
});

describe('SME sample data: restock (1.7) and the chat (1.8)', () => {
  it('lists every flagged item at or below its reorder level, with the app’s labels', () => {
    expect(smeRestock.rows.map((row) => [row.name, `${row.quantity} ${row.unit}`, row.badge, row.reorderLabel, row.suggestionLabel, row.level])).toEqual([
      ['Bread flour', '4 kg', 'Low Stock', 'Reorder at 10 kg', 'Suggested reorder: 26 kg', 40],
      ['Ube halaya', '0 jar', 'Out of Stock', 'Reorder at 6 jar', 'Suggested reorder: 12 jar', 0],
      ['Calamansi Juice 500ml', '0 pcs', 'Out of Stock', 'Reorder at 12 pcs', 'Suggested reorder: 24 pcs', 0],
    ]);
    for (const row of smeRestock.rows) expect(row.quantity).toBeLessThanOrEqual(row.reorderAt);
  });

  it('adds up the reorder cost and the advice', () => {
    expect(smeRestock.reorderCost).toBe(sum(smeRestock.rows.map((row) => row.suggested * row.unitCost)));
    expect(smeRestock.summary).toBe('3 item(s) are at or below their reorder level (2 out of stock). Estimated reorder cost: ₱3,020.');
    expect(smeRestock.advice).toEqual([
      'Order 26 kg of bread flour first; you have about 1.9 days of cover left.',
      'Ube halaya and Calamansi Juice 500ml are out of stock; the app suggests 12 jars and 24 pcs.',
      'Restocking all 3 flagged items costs about ₱3,020.',
    ]);
  });

  it('alternates questions and answers, starting from a suggestion chip', () => {
    expect(smeChat.thread.map((message) => message.from)).toEqual(['me', 'them', 'me', 'them', 'me', 'them']);
    expect(smeChat.thread[0]?.text).toBe(smeChat.suggestions[0]);
    expect(smeChat.thread[4]?.text).toBe(smeChat.suggestions[1]);
    expect(smeChat.offline.question).toBe(smeChat.suggestions[0]);
  });

  it('names exactly the restock rows, then declines to guess their quantities', () => {
    const last = smeChat.thread.at(-1)?.text ?? '';
    expect(last).toContain(`${smeRestock.rows.length} items are at or below their reorder level`);
    for (const row of smeRestock.rows) expect(last).toContain(row.name);
    expect(last).toContain("I don't have their exact quantities in this snapshot");
  });
});

// ─── SmeLogo ─────────────────────────────────────────────────────────────────────────────

const LOGO_TAGS = new Set(['span', 'svg', 'g', 'rect', 'path', 'polygon', 'circle']);
const tagsIn = (html: string): string[] => [...html.matchAll(/<([a-zA-Z][\w-]*)/g)].map((match) => (match[1] ?? '').toLowerCase());
const logo = (props: { variant?: SmeLogoVariant; size?: (typeof SME_LOGO_SIZES)[number] }): string => renderToStaticMarkup(createElement(SmeLogo, props));

describe('SmeLogo', () => {
  it.each(['full', 'icon', 'wordmark'] as const)('%s is decorative spans and inline SVG only', (variant) => {
    const html = logo({ variant });
    expect(tagsIn(html).filter((tag) => !LOGO_TAGS.has(tag))).toEqual([]);
    expect(html).toMatch(new RegExp(`^<span class="rx-sme-logo" data-variant="${variant}" data-size="md" aria-hidden="true"`));
    expect(html).not.toMatch(/\sdata-(active|paused|next)[\s=>]/);
  });

  it('draws the store icon for full and icon, and the wordmark for full and wordmark', () => {
    const word = (html: string): boolean => html.includes('>SME<') && html.includes('>PANIND<') && html.includes('>O<');
    expect([logo({ variant: 'full' }), logo({ variant: 'icon' }), logo({ variant: 'wordmark' })].map((html) => [html.includes('<svg'), word(html)])).toEqual([
      [true, true],
      [true, false],
      [false, true],
    ]);
  });

  it('keeps BrandLogo’s sizes and palette', () => {
    for (const size of SME_LOGO_SIZES) {
      const html = logo({ size });
      expect(html).toContain(`width="${SME_LOGO_ICON_PX[size]}"`);
      expect(html).toContain(`font-size:${SME_LOGO_FONT_PX[size].sme}px`);
      expect(html).toContain(`font-size:${SME_LOGO_FONT_PX[size].panindio}px`);
    }
    const html = logo({});
    for (const colour of ['#1e4d8c', '#f5a623', '#27ae60', '#f39c12', '#1a3a6b']) expect(html).toContain(colour);
  });
});
