import type { AppInfo } from '@/content/types';

/**
 * The three products, in showcase order. Company apps carry public-safe material only.
 * The SME icon is copied from the owner's own repo by scripts/prepare-assets.mjs; the Citizen
 * icon is the generic Defensys SAFE store icon; Responder has no public icon, so a monogram.
 */
export const apps: readonly AppInfo[] = [
  {
    id: 'sme',
    name: 'SME Panindio',
    short: 'SME',
    caseStudy: 'sme-panindio',
    context: 'personal',
    icon: { kind: 'image', src: '/brands/sme/icon.webp' },
    stageLabel: ['SME Panindio', 'Personal', 'private beta'],
    distribution: { kind: 'beta', label: 'Private beta' },
  },
  {
    id: 'citizen',
    name: 'Defensys Citizen',
    short: 'Citizen',
    caseStudy: 'defensys-citizen',
    context: 'company',
    icon: { kind: 'image', src: '/store/citizen/defensys-safe/play-icon.webp' },
    stageLabel: ['Defensys Citizen', 'Company', 'live on the stores'],
    distribution: { kind: 'stores' },
  },
  {
    id: 'responder',
    name: 'Defensys Responder',
    short: 'Responder',
    caseStudy: 'defensys-responder',
    context: 'company',
    icon: { kind: 'monogram', text: 'DR' },
    stageLabel: ['Defensys Responder', 'Company', 'private distribution'],
    distribution: { kind: 'private', label: 'Private distribution' },
  },
];
