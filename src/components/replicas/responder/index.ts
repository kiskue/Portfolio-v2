import './responder.css';
import type { ReplicaComponent } from '@/components/replicas/kit';
import { EmergencyMapScreen } from '@/components/replicas/responder/screens/emergency-map';
import { IncidentReportFormScreen } from '@/components/replicas/responder/screens/incident-report-form';
import { IncomingDispatchScreen } from '@/components/replicas/responder/screens/incoming-dispatch';
import { NavigateToIncidentScreen } from '@/components/replicas/responder/screens/navigate-to-incident';
import { PttChannelScreen } from '@/components/replicas/responder/screens/ptt-channel';
import { VideoCallScreen } from '@/components/replicas/responder/screens/video-call';
import type { ResponderFigureId } from '@/content/types';

/**
 * Defensys Responder replicas, one per figure 3.1–3.6 (exhaustive by type).
 *
 * This module is the single import of responder.css (the rx-responder-* parts). Every Responder
 * screen is reached through the registry, so the styles load wherever one renders. White-label
 * brands re-skin through the --app-* bridge only; the dispatch sheet, zones, severity and the
 * call palette are fixed (responder/parts/palette.ts).
 */
export const responderReplicas = {
  '3.1': EmergencyMapScreen,
  '3.2': IncomingDispatchScreen,
  '3.3': NavigateToIncidentScreen,
  '3.4': VideoCallScreen,
  '3.5': PttChannelScreen,
  '3.6': IncidentReportFormScreen,
} satisfies Record<ResponderFigureId, ReplicaComponent>;
