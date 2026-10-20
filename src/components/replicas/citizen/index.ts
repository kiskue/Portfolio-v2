import './citizen.css';
import type { ReplicaComponent } from '@/components/replicas/kit';
import type { CitizenFigureId } from '@/content/types';
import { HazardMapScreen } from './screens/hazard-map';
import { HomeDashboardScreen } from './screens/home-dashboard';
import { HomeFeedScreen } from './screens/home-feed';
import { LiveCallScreen } from './screens/live-call';
import { ReportIncidentScreen } from './screens/report-incident';
import { SosCountdownScreen } from './screens/sos-countdown';

/**
 * Defensys Citizen replicas, one per figure 2.1–2.6 (exhaustive by type), built from the
 * research layoutSpecs and the shipped app's UI source with fictional data (sample-data.ts).
 *
 * White-label: every brand hue comes through the --app-* bridge (rBrand / var(--rx-primary) …,
 * and the header mark paints --app-logo), so BrandVars and BrandScope re-skin these screens
 * without re-rendering. The SOS red, severity, status, hazard and call colours are fixed in
 * citizen.css and never follow the brand.
 *
 * This module is the single import of citizen.css (the app's tokens, part styles and the
 * [data-active] keyframes). Every Citizen screen is reached through the registry, so the styles
 * load wherever a Citizen replica renders.
 */
export const citizenReplicas = {
  '2.1': HomeDashboardScreen,
  '2.2': HomeFeedScreen,
  '2.3': SosCountdownScreen,
  '2.4': LiveCallScreen,
  '2.5': HazardMapScreen,
  '2.6': ReportIncidentScreen,
} satisfies Record<CitizenFigureId, ReplicaComponent>;
