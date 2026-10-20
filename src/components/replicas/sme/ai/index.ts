import './ai.css';
import type { ReplicaComponent } from '@/components/replicas/kit';
import type { SmeFigureId } from '@/content/types';
import { ChatSheetScreen } from './screens/chat-sheet';
import { InsightReportScreen } from './screens/insight-report';
import { RestockForecastScreen } from './screens/restock-forecast';
import { RoiInsightScreen } from './screens/roi-insight';

export { ENHANCE_TIMING } from './parts/enhance-timing';

/** The AI assistant screens: insight and report, restock and forecast, chat, ROI insight. */
export type SmeAiFigureId = Extract<SmeFigureId, '1.6' | '1.7' | '1.8' | '1.9'>;

/**
 * SME Panindio AI replicas, figures 1.6–1.9 (exhaustive by type; a core figure here fails the
 * check). All four are dark (the AI screen-local set in ../sme.css plus ./ai.css), and every
 * figure, answer and suggestion comes from ../sample-data.ts. Only 1.6 animates (its Home
 * glimpse, ENHANCE_TIMING); the rest are static pictures.
 */
export const smeAiReplicas = {
  '1.6': InsightReportScreen,
  '1.7': RestockForecastScreen,
  '1.8': ChatSheetScreen,
  '1.9': RoiInsightScreen,
} satisfies Record<SmeAiFigureId, ReplicaComponent>;
