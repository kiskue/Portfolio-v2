import type { ExperienceEntry } from '@/content/types';
import { ph } from '@/lib/placeholder';

/**
 * The About timeline, newest work first. Titles and dates I can't prove from git are placeholders
 * (never invented). Company wording is binding: I build and maintain the Citizen app, I built the
 * white-label Responder app, and the Command Center and API are the DGSI team's.
 */
export const experience: readonly ExperienceEntry[] = [
  {
    id: 'dgsi',
    period: ph('YYYY – present'),
    title: ph('Your title at DGSI'),
    org: 'Dynamic Global Soft Inc. (DGSI)',
    body: 'Mobile and web apps, mainly for the Defensys public-safety platform: built for Philippine local governments, their residents and their emergency responders.',
    projects: ['defensys-citizen', 'defensys-responder', 'defensys-citizen-web', 'eventbook-exhibitors', 'responder-ptt'],
    highlights: [
      'I build and maintain the Defensys Citizen mobile app: one white-label codebase with SOS video calls through a dispatcher queue, tickets with chat, and hazard, weather and earthquake alerts.',
      'I built the white-label Defensys Responder app: dispatch, road navigation, background location with an offline backlog, push-to-talk and video calls.',
      'Both apps integrate with the Command Center and API built by the DGSI team; I added the AI weather safety brief and facility-suggestion endpoints.',
      'For Citizen Web in Bagong Pag-asa I did the rebrand and built the Sumbong (citizen complaints) module.',
      ph('Your work on the v1 apps (2024–25), if any'),
    ],
    confirm:
      'Your DGSI title and start date, and whether you worked on the v1 apps (2024–25). Your earliest DGSI commits in the inspected repos are from Apr 2025 (Citizen Web).',
  },
  {
    id: 'sme-panindio',
    period: 'Dec 2025 – present',
    title: 'Solo developer',
    org: 'SME Panindio (personal product)',
    body: 'An offline-first business app for Filipino micro-businesses that I build end to end: the Expo app, a NestJS backend and a FastAPI AI service.',
    projects: ['sme-panindio'],
    highlights: [
      'Point of sale, inventory, an utang (store credit) ledger and real profit, all working offline on the phone.',
      'A storefront for suki (regular customers) and a rider app with live delivery tracking, in the same app.',
      'AI that explains the owner’s own numbers: the phone does the math, and Google Gemini, with an open-weights fallback via Ollama, writes the words.',
    ],
    confirm:
      'Dates come from git history (first commit Dec 2025). Also confirm the AI wording "an open-weights fallback via Ollama".',
  },
  {
    id: 'first-react-native-app',
    period: ph('YYYY'),
    title: 'Intern, then full-time developer',
    org: ph('Company'),
    body: 'The team worked in React and JavaScript, and I had no React Native experience when I was handed a mobile product. I shipped it solo, end to end: the team’s first React Native app. That delivery is why I was offered a full-time role.',
    projects: [],
    confirm: 'V1 claim. Confirm the company (DGSI?), the year and which app it was. If it was at DGSI, fold it into the DGSI entry.',
  },
  {
    id: 'earlier-web-work',
    period: ph('YYYY'),
    title: ph('Your role'),
    org: ph('Company or client'),
    body: 'Web systems: an ERP with signatory approvals, a digital member ID system, and a telemedicine platform with live video consultations.',
    projects: ['brilliant-erp', 'brilliant-virtual-id', 'telemedicine'],
    confirm: 'Where and when you built Brilliant ERP, Brilliant Virtual ID and Telemedicine, and your role on each.',
  },
];
