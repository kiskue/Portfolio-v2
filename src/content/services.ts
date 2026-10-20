import type { Engagement, ProcessStep, Service } from '@/content/types';
import { ph } from '@/lib/placeholder';

/**
 * The Services page (design §8): five services in ServiceId order (the UI numbers them 01–05),
 * a process strip and the engagement cards.
 *
 * Good-fit bullets and deliverables come from shipped work and are owner-reviewed (confirm notes).
 * Pricing, timelines, process details and engagement terms are the owner's to supply, so they are
 * whole-field placeholders: draft wording in label mode, removed in hide mode.
 */

const REVIEW = 'Review the good-fit bullets and deliverables, then fill in the timeline and pricing.';
const ENGAGEMENT = ph('Typical timeline and pricing');

export const services: readonly Service[] = [
  {
    id: 'mobile-apps',
    title: 'Mobile apps, end to end',
    short: 'Mobile apps',
    icon: 'smartphone',
    goodFit: [
      'You need one iOS and Android app, designed, built and released to the stores.',
      'You want one developer who can also build the API behind it.',
      'Your users are on budget phones and mobile data, not office Wi-Fi.',
    ],
    deliverables: [
      'An iOS and Android app from one React Native codebase',
      'Store listings and a release pipeline with over-the-air updates',
      'Tests and a component catalog your team can keep building on',
    ],
    proof: { slug: 'sme-panindio', anchor: 'built' },
    stack: ['React Native', 'Expo', 'TypeScript', 'Expo Router', 'EAS'],
    engagement: ENGAGEMENT,
    confirm: REVIEW,
  },
  {
    id: 'white-label',
    title: 'White-label & multi-brand apps',
    short: 'White-label apps',
    icon: 'palette',
    goodFit: [
      'You sell one app to several clients, and each wants its own name, colors, icon and store listing.',
      'You maintain forks of the same app and want them back in one codebase.',
    ],
    deliverables: [
      'One brand config that sets each build’s name, icons, colors and store identity',
      'Per-brand builds, store submissions and over-the-air updates from one pipeline',
      'Color checks so every brand palette stays readable',
    ],
    proof: { slug: 'defensys-citizen', anchor: 'brands' },
    stack: ['Expo', 'EAS Workflows', 'NativeWind', 'TypeScript'],
    engagement: ENGAGEMENT,
    confirm: REVIEW,
  },
  {
    id: 'realtime',
    title: 'Real-time & location features',
    short: 'Real-time & location',
    icon: 'radio',
    goodFit: [
      'Your app needs live updates: dispatch, orders, chat or presence.',
      'You need in-app video or voice calls, or live location on a map.',
      'Your users are on the move, on patchy mobile data.',
    ],
    deliverables: [
      'A socket layer with rooms, typed events and reconnects that recover state',
      'Video or voice calls with queueing and reconnect handling',
      'Live maps with background location that buffers while offline',
    ],
    proof: { slug: 'defensys-responder', anchor: 'built' },
    stack: ['Socket.IO', 'WebRTC', 'expo-location', 'expo-maps', 'MapLibre'],
    engagement: ENGAGEMENT,
    confirm: REVIEW,
  },
  {
    id: 'offline-first',
    title: 'Offline-first data',
    short: 'Offline-first',
    icon: 'wifi-off',
    goodFit: [
      'Your users work where the signal drops: shops, field teams, provinces.',
      'The app has to keep working, and keep its data, with no connection.',
      'You need backups or sync that survive retries, restarts and a lost phone.',
    ],
    deliverables: [
      'An on-device database with versioned migrations and a backup or sync protocol',
      'Screens with honest offline, syncing and error states',
      'Tests that run the data layer against real SQLite',
    ],
    proof: { slug: 'sme-panindio', anchor: 'challenges' },
    stack: ['SQLite', 'Zustand', 'TanStack Query', 'NestJS', 'MySQL'],
    engagement: ENGAGEMENT,
    confirm: REVIEW,
  },
  {
    id: 'grounded-ai',
    title: 'Grounded AI features',
    short: 'Grounded AI',
    icon: 'sparkles',
    goodFit: [
      'You want AI that explains your users’ real numbers instead of inventing them.',
      'You need answers in more than one language, such as English and Tagalog.',
      'You want to switch model providers without rewriting the app.',
    ],
    deliverables: [
      'A small AI service that only narrates numbers your app has already computed',
      'Guardrails: a grounding contract, a decline rule and input hygiene',
      'A provider layer with an automatic fallback model',
    ],
    proof: { slug: 'sme-panindio', anchor: 'ai' },
    stack: ['FastAPI', 'Pydantic', 'Google Gemini', 'Ollama', 'NestJS'],
    engagement: ENGAGEMENT,
    confirm: REVIEW,
  },
];

/** The process strip: Discover → Design → Build → Ship → Support. Bodies are draft wording. */
export const processSteps: readonly ProcessStep[] = [
  {
    id: 'discover',
    title: 'Discover',
    body: ph('A call to understand your users, constraints and what “done” means, then a written scope.'),
  },
  {
    id: 'design',
    title: 'Design',
    body: ph('Flows and key screens, agreed with you before any code is written.'),
  },
  {
    id: 'build',
    title: 'Build',
    body: ph('Regular builds on real devices, with tests around the parts that matter.'),
  },
  {
    id: 'ship',
    title: 'Ship',
    body: ph('Store listings, the release pipeline and a staged rollout.'),
  },
  {
    id: 'support',
    title: 'Support',
    body: ph('Fixes, updates and handover notes after launch, for an agreed period.'),
  },
];

/** Ways to work together. Terms and pricing are the owner's to write. */
export const engagements: readonly Engagement[] = [
  {
    id: 'full-time',
    title: 'Full-time role',
    body: ph('Open to full-time mobile or full-stack roles, remote or in Metro Manila.'),
    confirm: 'The roles and arrangements you are open to.',
  },
  {
    id: 'contract',
    title: 'Contract',
    body: ph('Contract work alongside your team, with overlap hours we agree on.'),
    confirm: 'Contract terms, availability and rates (or "on request").',
  },
  {
    id: 'fixed-scope',
    title: 'Fixed-scope project',
    body: ph('A fixed price for a defined scope, such as an MVP or a white-label rollout.'),
    confirm: 'Whether you take fixed-scope work, and how you price it.',
  },
];
