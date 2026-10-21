import type { FigureState } from '@/content/apps/figures';
import { formatNumber } from '@/lib/format';

/*
 * SME Panindio: the ONE shared sample dataset for replicas 1.1–1.9 (PLAN.md, Replica kit: "SME
 * uses one shared dataset, so the same net profit appears in every figure"). Screens copy their
 * names, figures and data-bearing sentences from here and never retype them; layout chrome
 * (button labels, section titles) stays in the screens, from the research layoutSpecs.
 *
 * Everything is FICTIONAL, from the research `sampleData` (sme-app.json, sme-ai.json),
 * reconciled into one shop. Names are generic Filipino first names or nicknames, phone numbers
 * are masked ("0917 ••• 0001"), and the address is "Sample St., Brgy. Sample".
 *
 * The story: Nena runs a small bakery and kakanin shop. Today is Monday, October 19, 2026, the
 * morning order #10482 goes out (1.5). "This month" is October 1–19, month to date.
 *
 * Reconciled on purpose (the research dossiers disagreed):
 * - This month is ₱48,250 revenue and ₱10,170 net profit wherever it appears (1.1, 1.6, 1.8, and
 *   the revenue in the 1.7 forecast); the AI dossier's ₱9,830 is gone.
 * - Business ROI is one set of figures: 18.5% on a ₱300,000 investment, ₱55,500 net profit
 *   all-time, Medium Risk (1.1 Business ROI card, 1.6 report, 1.9). The dashboard's "ROI
 *   Outlook" card is the ROI calculator's own scenario (a separate store in the app), so its Low
 *   Risk and "Break-even: 7mo 12d" are not 1.9's risk. The 1.9 low and high states keep the
 *   app's own example sentences, and their Breakeven Progress is sized to those sentences; the
 *   Top Products rows under it are this shop's (Ube Pandesal's 800 packs, as in the 1.6 report).
 * - The forecast (1.7) is drawn from October 1–18. Those 18 days plus today's ₱1,800 make the
 *   month's ₱48,250, and the daily target is ₱2,500 (72% met), in line with that pace.
 * - One catalog feeds POS (1.2), the storefront (1.4), the delivery order (1.5) and restock
 *   (1.7). Calamansi Juice 500ml is out of stock in all of them: order #10482 took the last two.
 * - One customer list: the credit ledger (1.3) is also the POS utang customer (1.2) and the
 *   AI chat's answer about who owes the most (1.8). Maria is the storefront suki (1.4) and the
 *   recipient of order #10482 (1.5).
 *
 * tests/unit/registry.sme.test.ts re-derives every total, margin, cart, change, ranking,
 * forecast and cross-figure mention, so an edit that breaks the story fails there.
 */

// ─── Formatting ──────────────────────────────────────────────────────────────────────────

/**
 * A peso amount as the app prints it: "₱48,250.00" (decimals 2: KPI cards, P&L, POS, ledger,
 * orders) or "₱48,250" (decimals 0: AI copy, forecast tiles and axes, the Business ROI card).
 */
export function peso(amount: number, decimals: 0 | 2 = 2): string {
  const [whole = '0', fraction] = Math.abs(amount).toFixed(decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}₱${grouped}${fraction === undefined ? '' : `.${fraction}`}`;
}

/** A percentage as the app prints it: percent(72) → "72%", percent(18.5, 1, true) → "+18.5%". */
export function percent(value: number, decimals = 0, signed = false): string {
  const text = `${value.toFixed(decimals)}%`;
  return signed && value >= 0 ? `+${text}` : text;
}

/** Rich text for AI copy: plain runs and bold runs (bold figures are drawn in the AI accent). */
export type SmeRichText = readonly (string | { readonly strong: string })[];

// ─── The day and the people ──────────────────────────────────────────────────────────────

export interface SmeToday {
  readonly iso: '2026-10-19';
  /** The date line under the greeting (1.1). */
  readonly long: string;
  /** The period navigator and the P&L title (1.1). */
  readonly month: string;
  /** Days in "this month" so far (October 1–19). */
  readonly monthDays: number;
}

export const smeToday: SmeToday = { iso: '2026-10-19', long: 'Monday, October 19, 2026', month: 'October 2026', monthDays: 19 };

export const smeOwner = { name: 'Nena', greeting: 'Good morning, Nena!' } as const;

/** The bell badge on the owner's TopNavBar (1.1 and the AI hub, 1.6). */
export const SME_OWNER_NOTIFICATIONS = 3;

// ─── Catalog (1.2, 1.4, 1.5, 1.7) ────────────────────────────────────────────────────────

export type SmeProductId =
  | 'ube-pandesal'
  | 'leche-flan'
  | 'bibingka-tray'
  | 'calamansi-juice'
  | 'pancit-bilao'
  | 'spanish-bread'
  | 'puto-cheese'
  | 'ensaymada-box';

export interface SmeProduct {
  readonly id: SmeProductId;
  readonly name: string;
  readonly price: number;
  /** Units on hand now: the POS stock pill, the storefront "Sold out" scrim and restock. */
  readonly stock: number;
  /** The storefront's amber "Popular" pill (1.4). */
  readonly popular?: true;
}

export const smeProducts: readonly SmeProduct[] = [
  { id: 'ube-pandesal', name: 'Ube Pandesal (10s)', price: 65, stock: 48, popular: true },
  { id: 'leche-flan', name: 'Leche Flan Tub', price: 180, stock: 12 },
  { id: 'bibingka-tray', name: 'Bibingka Party Tray', price: 550, stock: 4 },
  { id: 'calamansi-juice', name: 'Calamansi Juice 500ml', price: 45, stock: 0 },
  { id: 'pancit-bilao', name: 'Pancit Bihon Bilao', price: 450, stock: 6 },
  { id: 'spanish-bread', name: 'Spanish Bread (10s)', price: 60, stock: 36 },
  { id: 'puto-cheese', name: 'Puto Cheese (12s)', price: 120, stock: 20 },
  { id: 'ensaymada-box', name: 'Ensaymada Box (6s)', price: 210, stock: 9 },
];

/** Products in the shop ("24 Products" on the POS stat pill); smeProducts are the ones on screen. */
export const SME_CATALOG_SIZE = 24;

export function smeProduct(id: SmeProductId): SmeProduct {
  const product = smeProducts.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`Unknown SME product: ${id}`);
  return product;
}

/** POS tile bar colour by price: ≥₱500 indigo, ≥₱100 navy, otherwise green (--rx-sme-tier-*). */
export type SmePriceTier = 'indigo' | 'navy' | 'green';

export function smePriceTier(price: number): SmePriceTier {
  if (price >= 500) return 'indigo';
  return price >= 100 ? 'navy' : 'green';
}

/** The POS stock pill: "48 pcs" (green) or "Out of Stock" (red). The storefront says "Sold out". */
export function smeStockLabel(product: SmeProduct): string {
  return product.stock > 0 ? `${formatNumber(product.stock)} pcs` : 'Out of Stock';
}

export interface SmeCartLine {
  readonly product: SmeProductId;
  readonly qty: number;
}

/** Units in a cart (the "3 items" counts). */
export function smeCartUnits(lines: readonly SmeCartLine[]): number {
  return lines.reduce((total, line) => total + line.qty, 0);
}

/** A cart's subtotal at catalog prices. */
export function smeCartTotal(lines: readonly SmeCartLine[]): number {
  return lines.reduce((total, line) => total + smeProduct(line.product).price * line.qty, 0);
}

// ─── Customers and the credit ledger (1.2, 1.3, 1.8) ─────────────────────────────────────

export type SmeCustomerId = 'mang-tonyo' | 'aling-rosa' | 'kuya-ben' | 'nanay-cora' | 'jun-jun' | 'ate-liza' | 'tess' | 'mario';

export interface SmeCustomer {
  readonly id: SmeCustomerId;
  readonly name: string;
  /** Masked, never a dialable number. */
  readonly phone: string;
  /** Utang given so far. */
  readonly credit: number;
  /** Paid so far (above `credit` it is an advance). */
  readonly paid: number;
}

export const smeCustomers: readonly SmeCustomer[] = [
  { id: 'mang-tonyo', name: 'Mang Tonyo', phone: '0917 ••• 0001', credit: 3200, paid: 750 },
  { id: 'aling-rosa', name: 'Aling Rosa', phone: '0918 ••• 0002', credit: 1500, paid: 320 },
  { id: 'kuya-ben', name: 'Kuya Ben', phone: '0919 ••• 0003', credit: 1200, paid: 340 },
  { id: 'nanay-cora', name: 'Nanay Cora', phone: '0920 ••• 0004', credit: 900, paid: 480 },
  { id: 'jun-jun', name: 'Jun-Jun', phone: '0921 ••• 0005', credit: 300, paid: 120 },
  { id: 'ate-liza', name: 'Ate Liza', phone: '0922 ••• 0006', credit: 1000, paid: 1300 },
  { id: 'tess', name: 'Tess', phone: '0923 ••• 0007', credit: 650, paid: 650 },
  { id: 'mario', name: 'Mario', phone: '0924 ••• 0008', credit: 480, paid: 480 },
];

export function smeCustomer(id: SmeCustomerId): SmeCustomer {
  const customer = smeCustomers.find((candidate) => candidate.id === id);
  if (!customer) throw new Error(`Unknown SME customer: ${id}`);
  return customer;
}

export type SmeStanding = 'due' | 'advance' | 'paid';

/** One ranked card of the credit ledger (1.3), ready to draw. */
export interface SmeLedgerRow {
  readonly customer: SmeCustomerId;
  readonly name: string;
  readonly phone: string;
  /** "#1"–"#5" for debtors (medals for the top three); null shows the initial instead. */
  readonly rank: string | null;
  readonly medal: 'gold' | 'silver' | 'bronze' | null;
  readonly initial: string;
  readonly standing: SmeStanding;
  readonly due: number;
  /** The right-hand figure: "₱2,450.00" (due; amber under ₱1,000), "Advance ₱300.00" or "FULLY PAID". */
  readonly amountLabel: string;
  /** Due under ₱1,000 is amber (#92400E) instead of red (#991B1B). */
  readonly small: boolean;
  /** Share of credit paid, 0–100, for the 8px progress bar. */
  readonly paidShare: number;
  readonly stats: { readonly credit: string; readonly paid: string; readonly due: string };
}

const MEDALS = ['gold', 'silver', 'bronze'] as const;

function ledgerRows(customers: readonly SmeCustomer[]): readonly SmeLedgerRow[] {
  const standingOf = (customer: SmeCustomer): SmeStanding =>
    customer.paid < customer.credit ? 'due' : customer.paid > customer.credit ? 'advance' : 'paid';
  const debtors = customers.filter((customer) => standingOf(customer) === 'due').sort((a, b) => b.credit - b.paid - (a.credit - a.paid));
  const others = customers.filter((customer) => standingOf(customer) !== 'due');
  return [...debtors, ...others].map((customer, index): SmeLedgerRow => {
    const standing = standingOf(customer);
    const due = Math.max(customer.credit - customer.paid, 0);
    const isDebtor = standing === 'due';
    return {
      customer: customer.id,
      name: customer.name,
      phone: customer.phone,
      rank: isDebtor ? `#${index + 1}` : null,
      medal: isDebtor ? (MEDALS[index] ?? null) : null,
      initial: customer.name.charAt(0),
      standing,
      due,
      amountLabel: isDebtor ? peso(due) : standing === 'advance' ? `Advance ${peso(customer.paid - customer.credit)}` : 'FULLY PAID',
      small: isDebtor && due < 1000,
      paidShare: Math.min(100, Math.round((customer.paid / customer.credit) * 100)),
      stats: { credit: peso(customer.credit), paid: peso(customer.paid), due: peso(due) },
    };
  });
}

const LEDGER_ROWS = ledgerRows(smeCustomers);

function ledgerRow(id: SmeCustomerId): SmeLedgerRow {
  const row = LEDGER_ROWS.find((candidate) => candidate.customer === id);
  if (!row) throw new Error(`No ledger row for SME customer: ${id}`);
  return row;
}

const TOTAL_DUE = LEDGER_ROWS.reduce((total, row) => total + row.due, 0);
const ADVANCES = smeCustomers.reduce((total, customer) => total + Math.max(customer.paid - customer.credit, 0), 0);
const countOf = (standing: SmeStanding): number => LEDGER_ROWS.filter((row) => row.standing === standing).length;

/** The credit ledger screen (1.3). */
export const smeLedger = {
  totalDue: peso(TOTAL_DUE),
  advancesHeld: peso(ADVANCES),
  /** The filter pills: All, Due, Advance, Fully paid. */
  counts: { all: LEDGER_ROWS.length, due: countOf('due'), advance: countOf('advance'), paid: countOf('paid') },
  rows: LEDGER_ROWS,
} as const;

// ─── This month (1.1, 1.6, 1.7, 1.8) ─────────────────────────────────────────────────────

/** October 1–19 (month to date). Every figure that says "this month" reads these numbers. */
export const smeMonth = {
  revenue: 48250,
  inStore: { revenue: 36900, orders: 412 },
  online: { revenue: 11350, orders: 57 },
  orders: 469,
  productsSold: 1284,
  unitsProduced: 1350,
  /** Includes the ingredient waste below. */
  ingredientCost: 21040,
  ingredientWaste: 640,
  rawMaterialCost: 7340,
  cogs: 28380,
  grossProfit: 19870,
  utilities: 3200,
  overhead: 6500,
  netProfit: 10170,
  /** Today so far, against the daily sales target. */
  todaySales: 1800,
  dailyTarget: 2500,
} as const;

const MONTH = smeMonth;
const OPERATING = MONTH.utilities + MONTH.overhead;
const pctOfRevenue = (amount: number): number => (amount / MONTH.revenue) * 100;

/** One line of the P&L card (1.1), top to bottom, as the app draws it. */
export interface SmePnlRow {
  /** income: bold top line · section: uppercase 12/600 label · cost: indented red · waste: "· Waste", amber · subtotal: navy Gross Profit · total: green NET PROFIT after a 2px rule. */
  readonly kind: 'income' | 'section' | 'cost' | 'waste' | 'subtotal' | 'total';
  readonly label: string;
  readonly amount?: string;
  /** A 12px line under the row ("from 469 completed orders"). */
  readonly note?: string;
}

/** The owner dashboard (1.1). */
export const smeDashboard = {
  greeting: smeOwner.greeting,
  date: smeToday.long,
  /** Day / Week / Month / Year: Month is selected, and the navigator shows smeToday.month. */
  period: 'Month',
  notifications: SME_OWNER_NOTIFICATIONS,
  kpis: [
    { id: 'gross-income', label: 'Gross Income', value: peso(MONTH.revenue) },
    { id: 'products-sold', label: 'Products Sold', value: formatNumber(MONTH.productsSold) },
    { id: 'gross-profit', label: 'Gross Profit', value: peso(MONTH.grossProfit) },
    { id: 'cogs', label: 'COGS', value: peso(MONTH.cogs) },
  ],
  channels: [
    { id: 'in-store', label: 'In-store Sales', value: peso(MONTH.inStore.revenue), sub: `${formatNumber(MONTH.inStore.orders)} orders` },
    { id: 'online', label: 'Online Sales', value: peso(MONTH.online.revenue), sub: `${formatNumber(MONTH.online.orders)} orders` },
  ],
  split: [
    { id: 'orders', label: 'Total Orders', value: formatNumber(MONTH.orders) },
    { id: 'units', label: 'Units Produced', value: formatNumber(MONTH.unitsProduced) },
  ],
  pnl: {
    title: `P&L Summary — ${smeToday.month}`,
    rows: [
      { kind: 'income', label: 'Gross Income', amount: peso(MONTH.revenue), note: `from ${formatNumber(MONTH.orders)} completed orders` },
      { kind: 'section', label: 'COGS (Cost of Goods Sold)' },
      { kind: 'cost', label: 'Ingredient Cost', amount: peso(MONTH.ingredientCost) },
      { kind: 'waste', label: '· Waste', amount: peso(MONTH.ingredientWaste) },
      { kind: 'cost', label: 'Raw Material Cost', amount: peso(MONTH.rawMaterialCost) },
      { kind: 'subtotal', label: 'Gross Profit', amount: peso(MONTH.grossProfit) },
      { kind: 'section', label: 'Operating Expenses' },
      { kind: 'cost', label: 'Utilities', amount: peso(MONTH.utilities) },
      { kind: 'cost', label: 'Overhead', amount: peso(MONTH.overhead) },
      { kind: 'total', label: 'NET PROFIT', amount: peso(MONTH.netProfit) },
    ] satisfies readonly SmePnlRow[],
  },
  target: {
    sold: peso(MONTH.todaySales),
    target: peso(MONTH.dailyTarget),
    percent: Math.round((MONTH.todaySales / MONTH.dailyTarget) * 100),
    summary: `${percent((MONTH.todaySales / MONTH.dailyTarget) * 100)} of ${peso(MONTH.dailyTarget)} today`,
  },
  /** "Sales vs Costs": [sales, costs] per week (costs = COGS + operating expenses). Week 3 runs to today. */
  salesVsCosts: {
    labels: ['Wk 1', 'Wk 2', 'Wk 3'],
    pairs: [
      [17450, 13770],
      [17880, 14110],
      [12920, 10200],
    ],
  },
  /** The ROI calculator's scenario (purple card): not the Business ROI below. */
  roiOutlook: {
    risk: 'low',
    breakeven: 'Break-even: 7mo 12d',
    insight: `Break even in 7 months 12 days at this month's sales pace. Gross margin is a healthy ${percent(pctOfRevenue(MONTH.grossProfit), 1)}.`,
  },
} as const;

// ─── Business ROI (1.1 card, 1.6 report, 1.9) ────────────────────────────────────────────

const ROI = { investment: 300000, netProfitAllTime: 55500, unitsSoldToDate: 7040, breakevenUnits: 11000 } as const;
const ROI_PERCENT = (ROI.netProfitAllTime / ROI.investment) * 100;
const TOP_PRODUCT = { product: 'ube-pandesal', unitsAllTime: 800 } as const satisfies { product: SmeProductId; unitsAllTime: number };

export type SmeRisk = FigureState<'1.9'>;

/** Business ROI's Breakeven Progress (BreakevenProgress molecule): units sold against the break-even goal. */
export interface SmeBreakeven {
  readonly sold: number;
  readonly goal: number;
  /** Units still needed ("Need 3,960 more to break even", "Sell 3,960 more units…"). */
  readonly remaining: number;
  /** sold ÷ goal, capped at 100, rounded: the badge and the bar. */
  readonly percent: number;
}

function breakeven(sold: number, goal: number): SmeBreakeven {
  return { sold, goal, remaining: Math.max(0, goal - sold), percent: Math.round(Math.min(sold / goal, 1) * 100) };
}

/** One row of Business ROI's "Top Products by Revenue" (ProductRow): all-time units, revenue and contribution margin. */
export interface SmeRoiProduct {
  readonly product: SmeProductId;
  readonly name: string;
  readonly units: number;
  readonly revenue: number;
  /** Revenue after the product's own costs (the app's contributionMargin). */
  readonly contribution: number;
  /** "800 units". */
  readonly unitsLabel: string;
  /** "₱52,000". */
  readonly revenueLabel: string;
  /** "Margin: 46.2%". */
  readonly marginLabel: string;
  /** The 5 px bar: revenue against the best seller's, 0–100. */
  readonly share: number;
}

/** All-time units and contribution per product; revenue is units at the catalog price. Best seller first. */
const ROI_PRODUCTS = [
  { product: TOP_PRODUCT.product, units: TOP_PRODUCT.unitsAllTime, contribution: 24024 },
  { product: 'leche-flan', units: 150, contribution: 10395 },
  { product: 'pancit-bilao', units: 50, contribution: 7965 },
] as const satisfies readonly { product: SmeProductId; units: number; contribution: number }[];

const ROI_PRODUCT_ROWS: readonly SmeRoiProduct[] = ROI_PRODUCTS.map((row) => {
  const { name, price } = smeProduct(row.product);
  const revenue = row.units * price;
  const best = smeProduct(ROI_PRODUCTS[0].product).price * ROI_PRODUCTS[0].units;
  return {
    ...row,
    name,
    revenue,
    unitsLabel: `${formatNumber(row.units)} units`,
    revenueLabel: peso(revenue, 0),
    marginLabel: `Margin: ${((row.contribution / revenue) * 100).toFixed(1)}%`,
    share: Math.round((revenue / best) * 100),
  };
});

/** The whole business since opening, and its rule-based risk (Medium: ROI 10–25%, payback within 24 months, profitable). */
export const smeRoi = {
  ...ROI,
  roiPercent: ROI_PERCENT,
  risk: 'medium' satisfies SmeRisk,
  topProduct: TOP_PRODUCT,
  /** The dashboard's Business ROI card (1.1): risk chip, ROI | Net Profit | Breakeven, 5px track. */
  card: {
    roi: percent(ROI_PERCENT, 1, true),
    netProfit: peso(ROI.netProfitAllTime, 0),
    breakeven: percent((ROI.unitsSoldToDate / ROI.breakevenUnits) * 100),
    breakevenPercent: Math.round((ROI.unitsSoldToDate / ROI.breakevenUnits) * 100),
  },
  /**
   * The 1.9 card body per state. medium is the app's rule-based template filled with this shop's
   * figures; low and high are the app's own example sentences for those risk levels.
   */
  insight: {
    medium: `Your business has earned ${peso(ROI.netProfitAllTime, 0)} net profit on a ${peso(ROI.investment, 0)} total investment — an ROI of ${percent(ROI_PERCENT, 1)}, within the healthy 15–30% SME range.`,
    low: 'Break even in 4 months 12 days at your current volume of 320 units a month. Gross margin is a healthy 42.5%.',
    high: 'At current prices, break-even takes 22 months — consider raising your price or cutting fixed costs to bring this under 18 months.',
  } satisfies Readonly<Record<SmeRisk, string>>,
  /**
   * Breakeven Progress under the 1.9 AI block, per state. medium is this shop (7,040 of 11,000
   * units). low and high size the example shops to their own sentences: 1,408 units to go at
   * 320 a month is 4 months 12 days, and 6,600 to go at 300 a month is 22 months.
   */
  breakeven: {
    medium: breakeven(ROI.unitsSoldToDate, ROI.breakevenUnits),
    low: breakeven(2192, 3600),
    high: breakeven(2400, 9000),
  } satisfies Readonly<Record<SmeRisk, SmeBreakeven>>,
  /** "Top Products by Revenue" (1.9, below Breakeven Progress): all-time, best seller first. */
  products: ROI_PRODUCT_ROWS,
  /** "Ask AI about this" opens the chat scoped to ROI. */
  chat: {
    title: 'Ask about your ROI',
    suggestions: ['How is my business doing?', 'What should I focus on to improve ROI?', 'Which product makes me the most money?'],
  },
} as const;

// ─── AI insight and report (1.6) ─────────────────────────────────────────────────────────

const TOP_PRODUCT_NAME = smeProduct(TOP_PRODUCT.product).name.replace(/ \(.*\)$/, '');
const NET_MARGIN = percent(pctOfRevenue(MONTH.netProfit));

export const smeInsight = {
  /** The computed line that always works offline (state 'idle'), typed out at 18 ms a character. */
  computed: `This month: ${peso(MONTH.revenue, 0)} in revenue and ${peso(MONTH.netProfit, 0)} in net profit.`,
  /** The AI-written upgrade of the same line (state 'enhanced'). Illustrative, not real model output. */
  enhanced: `Net profit is ${peso(MONTH.netProfit, 0)} on ${peso(MONTH.revenue, 0)} in revenue this month, a ${NET_MARGIN} margin after ingredients, utilities and overhead. Online orders brought in ${percent(pctOfRevenue(MONTH.online.revenue))} of sales, and ${TOP_PRODUCT_NAME} is still your top seller.`,
  reportHint: 'A short AI-written summary of your business performance.',
  /** The generated report: markdown bullets with bold figures. */
  report: [
    [{ strong: 'Profitability:' }, ' ROI of ', { strong: percent(ROI_PERCENT, 1) }, ' and ', { strong: peso(ROI.netProfitAllTime, 0) }, ' net profit all-time.'],
    [{ strong: 'Cost pressure:' }, ' utilities and overhead come to ', { strong: peso(OPERATING, 0) }, ' this month.'],
    [
      { strong: 'Best performer:' },
      ' ',
      { strong: TOP_PRODUCT_NAME },
      `, ${peso(TOP_PRODUCT.unitsAllTime * smeProduct(TOP_PRODUCT.product).price, 0)} from ${formatNumber(TOP_PRODUCT.unitsAllTime)} packs.`,
    ],
    [{ strong: 'Watch:' }, ' net margin is ', { strong: NET_MARGIN }, ', close to the 20% caution line.'],
  ] satisfies readonly SmeRichText[],
} as const;

// ─── Restock and forecast (1.7) ──────────────────────────────────────────────────────────

export interface SmeRestockItem {
  readonly name: string;
  /** Set when the item is a catalog product: its quantity is that product's stock. */
  readonly product?: SmeProductId;
  readonly quantity: number;
  /** As the app stores it ("kg", "pcs", "jar"). */
  readonly unit: string;
  readonly reorderAt: number;
  readonly suggested: number;
  readonly unitCost: number;
  /** Average use a day, for the AI advice's "days of cover". */
  readonly dailyUse?: number;
}

/** One restock row, ready to draw: quantity tile, badge, "Reorder at", 6px bar, suggestion. */
export interface SmeRestockRow extends SmeRestockItem {
  readonly health: 'low' | 'out';
  readonly badge: 'Low Stock' | 'Out of Stock';
  readonly reorderLabel: string;
  readonly suggestionLabel: string;
  /**
   * The 6 px bar's fill, 0–100, as the app's StockHealthIndicator draws it (stockFillRatio):
   * quantity against three times the reorder level, so a low item still shows most of its bar empty.
   */
  readonly level: number;
}

const FLOUR = { name: 'Bread flour', quantity: 4, unit: 'kg', reorderAt: 10, suggested: 26, unitCost: 52, dailyUse: 2.1 } as const satisfies SmeRestockItem;
const HALAYA = { name: 'Ube halaya', quantity: 0, unit: 'jar', reorderAt: 6, suggested: 12, unitCost: 95 } as const satisfies SmeRestockItem;
const JUICE = {
  name: smeProduct('calamansi-juice').name,
  product: 'calamansi-juice',
  quantity: smeProduct('calamansi-juice').stock,
  unit: 'pcs',
  reorderAt: 12,
  suggested: 24,
  unitCost: 22,
} as const satisfies SmeRestockItem;
const RESTOCK_ITEMS: readonly SmeRestockItem[] = [FLOUR, HALAYA, JUICE];

const RESTOCK_ROWS = RESTOCK_ITEMS.map((item): SmeRestockRow => {
  const out = item.quantity === 0;
  return {
    ...item,
    health: out ? 'out' : 'low',
    badge: out ? 'Out of Stock' : 'Low Stock',
    reorderLabel: `Reorder at ${item.reorderAt} ${item.unit}`,
    suggestionLabel: `Suggested reorder: ${item.suggested} ${item.unit}`,
    level: Math.round(Math.min(1, item.quantity / (item.reorderAt * 3)) * 100),
  };
});
const REORDER_COST = RESTOCK_ITEMS.reduce((total, item) => total + item.suggested * item.unitCost, 0);
const OUT_COUNT = RESTOCK_ROWS.filter((row) => row.health === 'out').length;

export const smeRestock = {
  rows: RESTOCK_ROWS,
  reorderCost: REORDER_COST,
  /** The computed "Restock Advice" line that works offline. */
  summary: `${RESTOCK_ROWS.length} item(s) are at or below their reorder level (${OUT_COUNT} out of stock). Estimated reorder cost: ${peso(REORDER_COST, 0)}.`,
  /** "Get AI advice": illustrative model output, grounded in the rows above. */
  advice: [
    `Order ${FLOUR.suggested} ${FLOUR.unit} of ${FLOUR.name.toLowerCase()} first; you have about ${(FLOUR.quantity / FLOUR.dailyUse).toFixed(1)} days of cover left.`,
    `${HALAYA.name} and ${JUICE.name} are out of stock; the app suggests ${HALAYA.suggested} jars and ${JUICE.suggested} pcs.`,
    `Restocking all ${RESTOCK_ROWS.length} flagged items costs about ${peso(REORDER_COST, 0)}.`,
  ],
} as const;

/**
 * Daily revenue for October 1–18 (Thursday to Sunday; weekends and the 15th payday run higher).
 * With today's ₱1,800 they make the month's ₱48,250.
 */
const HISTORY = [2395, 2575, 2665, 2860, 2205, 2360, 2390, 2435, 2640, 2745, 2925, 2260, 2390, 2485, 2650, 2655, 2810, 3005] as const;
const AVERAGE_DAILY = HISTORY.reduce((total, value) => total + value, 0) / HISTORY.length;
/** The second half of the period against the first, in percent. */
const TREND = 6.2;
/** The least-squares line over HISTORY, summed over the next 30 days, to the nearest ₱10. */
const NEXT_30_DAYS = 88640;

export const smeForecast = {
  /** Solid line with dots, one point a day (October 1–18). */
  history: HISTORY,
  /** Dashed line for the next 14 days (Oct 19 – Nov 1): the least-squares fit over history, rounded. */
  projected: [2729, 2744, 2760, 2775, 2791, 2807, 2822, 2838, 2853, 2869, 2885, 2900, 2916, 2931],
  /** The plot's value range (bottom and top gridlines). */
  yMin: 2000,
  yMax: 3200,
  /** Top to bottom, one per gridline. */
  yLabels: [peso(3200, 0), peso(2800, 0), peso(2400, 0), peso(2000, 0)],
  /** Left to right: days of October, then days ahead. */
  xLabels: ['1', '6', '11', '16', '+1', '+7', '+14'],
  averageDaily: AVERAGE_DAILY,
  trend: TREND,
  next30Days: NEXT_30_DAYS,
  tiles: [
    { id: 'average', label: 'Avg daily revenue', value: peso(AVERAGE_DAILY, 0) },
    { id: 'next-30', label: 'Next 30 days (est.)', value: peso(NEXT_30_DAYS, 0) },
    { id: 'trend', label: 'Trend', value: percent(TREND, 1, true) },
  ],
  /** The computed "Forecast Insight" line that works offline. */
  summary: `${peso(AVERAGE_DAILY, 0)} average daily revenue, trending up ${percent(TREND, 1)} recently.`,
  /** "Explain forecast": illustrative model output, grounded in the figures above. */
  narrative: `October has brought in ${peso(MONTH.revenue, 0)} so far. Daily sales averaged ${peso(AVERAGE_DAILY, 0)}, and the second half of the period ran ${percent(TREND, 1)} above the first, so the app's own projection estimates about ${peso(NEXT_30_DAYS, 0)} for the next 30 days. That is an estimate, not a guarantee.`,
} as const;

// ─── Ask AI (1.8) ────────────────────────────────────────────────────────────────────────

export interface SmeChatMessage {
  readonly from: 'me' | 'them';
  readonly text: string;
}

const TOP_DEBTOR = ledgerRow('mang-tonyo');

export const smeChat = {
  title: 'Ask about your business',
  titleTagalog: 'Magtanong tungkol sa iyong negosyo',
  subtitle: 'Grounded in your on-device figures',
  greeting: 'Hi! Ask me anything about your ROI, profit, break-even, or top products. I answer only from your real figures.',
  suggestions: ['How were my sales this month?', 'Which products should I restock?', 'Where can I cut costs?'],
  /** State 'thread', oldest first. The last answer shows the decline rule: no quantities in the snapshot, so no guess. */
  thread: [
    { from: 'me', text: 'How were my sales this month?' },
    {
      from: 'them',
      text: `This month you made ${peso(MONTH.revenue, 0)} in revenue and ${peso(MONTH.netProfit, 0)} in net profit, combining in-store POS and online orders. ${TOP_PRODUCT_NAME} is still your top seller.`,
    },
    { from: 'me', text: 'Who owes me the most?' },
    {
      from: 'them',
      text: `${TOP_DEBTOR.name}, with ${peso(TOP_DEBTOR.due, 0)} still due. In all, ${countOf('due')} customers owe ${peso(TOTAL_DUE, 0)}.`,
    },
    { from: 'me', text: 'Which products should I restock?' },
    {
      from: 'them',
      text: `${RESTOCK_ROWS.length} items are at or below their reorder level: ${FLOUR.name}, ${HALAYA.name} and ${JUICE.name}. I don't have their exact quantities in this snapshot, so check the Restock section for suggested amounts.`,
    },
  ] satisfies readonly SmeChatMessage[],
  /** State 'offline': the question, then a pale-red bubble. */
  offline: {
    question: 'How were my sales this month?',
    title: 'AI needs a connection',
    body: 'Connect to the internet to ask the AI. Your ROI numbers still work offline.',
  },
  thinking: 'Thinking…',
  placeholder: 'Ask a question about your numbers…',
} as const;

// ─── Point of sale (1.2) ─────────────────────────────────────────────────────────────────

const POS_CART: readonly SmeCartLine[] = [
  { product: 'ube-pandesal', qty: 2 },
  { product: 'leche-flan', qty: 1 },
];
const POS_TOTAL = smeCartTotal(POS_CART);
const POS_UNITS = smeCartUnits(POS_CART);
const POS_TENDERED = 500;
const POS_ORDER = 'MGXK3Z2A-7QF';
const UTANG_CUSTOMER: SmeCustomerId = 'mang-tonyo';

/** The point of sale (1.2): grid, docked checkout bar, checkout sheet and the confirmed sale. */
export interface SmePos {
  /** Tile order in the 2-column grid. Tiles in the cart show the stepper and the tinted border. */
  readonly grid: readonly SmeProductId[];
  /** The stat pills: "24 Products" (navy) and "3 in cart" (green). */
  readonly productCount: string;
  readonly cartCount: string;
  readonly cart: readonly SmeCartLine[];
  /** No discount, and the shop is not VAT-registered (no Output VAT row), so total = subtotal. */
  readonly subtotal: string;
  readonly total: string;
  /** Under "Checkout" on the docked bar. */
  readonly checkoutSublabel: string;
  /** Under the sheet title. */
  readonly orderLine: string;
  readonly itemsTitle: string;
  /** Cash is the selected method. */
  readonly payment: 'cash';
  readonly tendered: string;
  /** The green change pill. */
  readonly change: string;
  /** The footer button; state 'confirmed' turns it into the green "Sale Confirmed!". */
  readonly confirm: string;
  /** The Utang alternative: a ledger customer with the standing badge. */
  readonly utang: { readonly customer: SmeCustomerId; readonly name: string; readonly badge: string };
}

export const smePos: SmePos = {
  grid: ['ube-pandesal', 'leche-flan', 'bibingka-tray', 'calamansi-juice', 'pancit-bilao', 'spanish-bread', 'puto-cheese', 'ensaymada-box'],
  productCount: `${SME_CATALOG_SIZE} Products`,
  cartCount: `${POS_UNITS} in cart`,
  cart: POS_CART,
  subtotal: peso(POS_TOTAL),
  total: peso(POS_TOTAL),
  checkoutSublabel: `${POS_UNITS} items · ${peso(POS_TOTAL)}`,
  orderLine: `Order #${POS_ORDER} · ${POS_UNITS} items`,
  itemsTitle: `Order Items (${POS_UNITS})`,
  payment: 'cash',
  tendered: peso(POS_TENDERED),
  change: `Change: ${peso(POS_TENDERED - POS_TOTAL)}`,
  confirm: `Confirm Sale · ${peso(POS_TOTAL)}`,
  utang: { customer: UTANG_CUSTOMER, name: smeCustomer(UTANG_CUSTOMER).name, badge: `Due ${peso(ledgerRow(UTANG_CUSTOMER).due)}` },
};

// ─── Suki storefront (1.4) and order tracking (1.5) ──────────────────────────────────────

const SUKI = 'Maria';
const STOREFRONT_CART: readonly SmeCartLine[] = [
  { product: 'leche-flan', qty: 1 },
  { product: 'ube-pandesal', qty: 1 },
];

/** The suki storefront (1.4). */
export interface SmeStorefront {
  readonly customer: string;
  /** The navy header band. */
  readonly headerTitle: string;
  /** The greeting under the band. */
  readonly greeting: string;
  /** The status pill: Pay Later stays locked until she verifies. */
  readonly verification: 'Unverified';
  /** The bell's red count. */
  readonly unread: number;
  /** "All Items", 2 columns. In-cart products show a stepper; stock 0 shows the "Sold out" scrim. */
  readonly grid: readonly SmeProductId[];
  /** Filled hearts. */
  readonly favorites: readonly SmeProductId[];
  readonly cart: readonly SmeCartLine[];
  /** The floating navy cart button. */
  readonly cartLabel: string;
}

export const smeStorefront: SmeStorefront = {
  customer: SUKI,
  headerTitle: `Hi, ${SUKI}`,
  greeting: `Hello, ${SUKI}!`,
  verification: 'Unverified',
  unread: 1,
  grid: ['ube-pandesal', 'leche-flan', 'pancit-bilao', 'calamansi-juice', 'bibingka-tray', 'puto-cheese'],
  favorites: ['leche-flan'],
  cart: STOREFRONT_CART,
  cartLabel: `View Cart · ${smeCartUnits(STOREFRONT_CART)} items · ${peso(smeCartTotal(STOREFRONT_CART))}`,
};

const DELIVERY_ITEMS: readonly SmeCartLine[] = [
  { product: 'pancit-bilao', qty: 1 },
  { product: 'leche-flan', qty: 1 },
  { product: 'calamansi-juice', qty: 2 },
];
const DELIVERY_TOTAL = smeCartTotal(DELIVERY_ITEMS);
const RIDER = { name: 'Juan D.', vehicle: 'Motorcycle' } as const;
const REMAINING = { km: 2.4, minutes: 7 } as const;
const TRIP = { km: 3.1, minutes: 9 } as const;

export interface SmeInfoRow {
  readonly label: string;
  readonly value: string;
  readonly emphasis?: true;
}

export const smeDelivery = {
  title: 'Order #10482',
  items: DELIVERY_ITEMS,
  rider: RIDER,
  /** The scrim chip on the map and the rider card line. */
  eta: `${REMAINING.km} km · ~${REMAINING.minutes} min`,
  riderLine: `${RIDER.vehicle} · ${REMAINING.km} km · ~${REMAINING.minutes} min`,
  headline: 'Your order is on the way',
  /** Order Status timeline: done, then the active step, then pending. */
  steps: [
    { label: 'Pending', state: 'done' },
    { label: 'Confirmed', state: 'done' },
    { label: 'Preparing', state: 'done' },
    { label: 'Ready', state: 'done' },
    { label: 'Out for delivery', state: 'active' },
    { label: 'Completed', state: 'pending' },
  ],
  /** Order Summary: three groups separated by dividers. */
  summary: [
    [
      { label: 'Order Date', value: 'Oct 19, 2026, 11:42 AM' },
      { label: 'Fulfillment', value: 'Delivery' },
      { label: 'Payment', value: 'Pay Now' },
      { label: 'Payment Status', value: 'Paid' },
    ],
    [
      { label: 'Recipient', value: `${SUKI} S.` },
      { label: 'Deliver to', value: 'Blk 4 Lot 12, Sample St., Brgy. Sample, Quezon City' },
      { label: 'Landmark', value: 'Green gate beside the sari-sari store' },
      { label: 'Distance', value: `${TRIP.km} km` },
      { label: 'Est. travel time', value: `~${TRIP.minutes} min` },
      { label: 'Vehicle', value: RIDER.vehicle },
    ],
    [
      { label: 'Subtotal', value: peso(DELIVERY_TOTAL) },
      { label: 'Delivery', value: 'FREE' },
      { label: 'Total', value: peso(DELIVERY_TOTAL), emphasis: true },
    ],
  ] satisfies readonly (readonly SmeInfoRow[])[],
} as const;
