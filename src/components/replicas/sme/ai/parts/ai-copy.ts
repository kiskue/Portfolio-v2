/**
 * Layout chrome of the AI screens: section titles, card labels and button labels, exactly as the
 * app's English strings have them (the `ai` and `businessRoi` keys). Data-bearing text (figures,
 * AI answers, suggestions) never lives here: it comes from ../../sample-data.ts.
 */
export const AI_COPY = {
  hubTitle: 'AI Assistant',
  insightSection: 'Business insight',
  insightLabel: 'Business Insight',
  enhance: 'Enhance with AI',
  enhancing: 'Enhancing…',
  enhanced: 'AI-generated',
  reportSection: 'Business report',
  reportLabel: 'Business Report',
  generateReport: 'Generate report',
  restockSection: 'Restock',
  restockLabel: 'Restock Advice',
  getAdvice: 'Get AI advice',
  forecastSection: 'Sales forecast',
  forecastLabel: 'Forecast Insight',
  historyLegend: 'History',
  projectedLegend: 'Projected',
  explainForecast: 'Explain forecast',
  askSection: 'Ask AI',
  askAbout: 'Ask AI about this',
  roiSection: 'AI Business Insight',
  roiLabel: 'AI Insight',
  breakevenSection: 'Breakeven Progress',
} as const;
