import type { AiBuild } from '@/content/types';
import { caseStudyHref, projectsHref } from '@/lib/routes';

/**
 * The Home "AI builds" chips (design §4.3): exactly four, in this order. Status is shown by shape,
 * colour and a legend: live (shipped) = filled, beta = half, building = ring with dot,
 * prototype = dashed ring. The UI builds each accessible name as "<label>, <status>".
 *
 * Company wording is binding: the Defensys apps integrate with the Command Center and API built
 * by the DGSI team; I added the AI weather safety brief and facility-suggestion endpoints.
 */
export const aiBuilds: readonly AiBuild[] = [
  {
    id: 'sme-ai-assistant',
    label: 'SME AI assistant',
    icon: 'bot',
    status: 'beta',
    href: caseStudyHref('sme-panindio', 'ai'),
    confirm:
      'Beta, like the app. The site describes the models as Google Gemini with an "open-weights fallback via Ollama" and never says where the fallback runs. Confirm that wording, and that the AI features already run for beta users (the AI service’s production status was not verified).',
  },
  {
    id: 'citizen-safety-brief',
    label: 'Citizen safety brief',
    icon: 'cloud-sun',
    status: 'live',
    href: caseStudyHref('defensys-citizen', 'built'),
  },
  {
    id: 'responder-facility-ranking',
    label: 'Responder facility ranking',
    icon: 'hospital',
    status: 'building',
    href: caseStudyHref('defensys-responder', 'built'),
    confirm: 'The facility-suggestion endpoint is in the API; the app side is in progress. Switch to live when it ships.',
  },
  {
    id: 'jp-live-subtitles',
    label: 'JP Live Subtitles',
    icon: 'captions',
    status: 'prototype',
    href: projectsHref({ type: 'ai' }),
  },
];
