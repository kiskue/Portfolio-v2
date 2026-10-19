// STUB — owned by W7, replaced in wave 2
import type { Glimpse } from '@/content/types';

/*
 * Home glimpses follow PLAN.md exactly (3 steps each; tests/unit/content.invariants.test.ts
 * checks the sequences). Hero glimpses exist so case studies can reference `hero.<slug>`;
 * W7 replaces every step with full timing, taps and captions (design §5.3, §6).
 */
export const glimpses: readonly Glimpse[] = [
  {
    id: 'home.sme',
    app: 'sme',
    label: 'Preview of SME Panindio: owner dashboard, point of sale and AI insight. Fictional data.',
    steps: [
      { figure: '1.1', state: 'kpis', posterState: 'kpis', holdMs: 3200 },
      { figure: '1.2', state: 'grid', posterState: 'confirmed', holdMs: 4400 },
      { figure: '1.6', state: 'idle', posterState: 'enhanced', holdMs: 3800 },
    ],
    posterStep: 0,
  },
  {
    id: 'home.citizen',
    app: 'citizen',
    label: 'Preview of Defensys Citizen: home dashboard, SOS countdown and video call. Fictional data.',
    steps: [
      { figure: '2.1', state: 'top', posterState: 'top', holdMs: 3200 },
      { figure: '2.3', state: 'idle', posterState: 'countdown', holdMs: 3700 },
      { figure: '2.4', state: 'queue', posterState: 'connected', holdMs: 3000 },
    ],
    posterStep: 0,
    brandRotation: ['smile-safe-taytay', '1hope'],
  },
  {
    id: 'home.responder',
    app: 'responder',
    label: 'Preview of Defensys Responder: duty switch, incoming dispatch and navigation. Fictional data.',
    steps: [
      { figure: '3.1', state: 'offline', posterState: 'online', holdMs: 2800 },
      { figure: '3.2', state: 'toast', posterState: 'sheet', holdMs: 3000 },
      { figure: '3.3', state: 'far', posterState: 'on-site', holdMs: 3600 },
    ],
    posterStep: 0,
  },
  {
    id: 'hero.sme-panindio',
    app: 'sme',
    label: 'Preview of SME Panindio: owner dashboard, point of sale and AI insight. Fictional data.',
    steps: [{ figure: '1.1', holdMs: 3200 }, { figure: '1.2', holdMs: 4400 }, { figure: '1.6', holdMs: 3800 }],
    posterStep: 0,
  },
  {
    id: 'hero.defensys-citizen',
    app: 'citizen',
    label: 'Preview of Defensys Citizen: home dashboard, SOS countdown and video call. Fictional data.',
    steps: [{ figure: '2.1', holdMs: 3200 }, { figure: '2.3', holdMs: 3700 }, { figure: '2.4', holdMs: 3000 }],
    posterStep: 0,
  },
  {
    id: 'hero.defensys-responder',
    app: 'responder',
    label: 'Preview of Defensys Responder: duty switch, incoming dispatch and navigation. Fictional data.',
    steps: [{ figure: '3.1', holdMs: 2800 }, { figure: '3.2', holdMs: 3000 }, { figure: '3.3', holdMs: 3600 }],
    posterStep: 0,
  },
];
