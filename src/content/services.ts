// STUB — owned by W2, replaced in wave 1
import type { Service } from '@/content/types';
import { ph } from '@/lib/placeholder';

export const services: readonly Service[] = [
  {
    id: 'mobile-apps',
    title: 'Mobile apps, end to end',
    short: 'Mobile apps',
    icon: 'smartphone',
    goodFit: ['You need an iOS and Android app designed, built and released to the stores.'],
    deliverables: [ph('Deliverables')],
    proof: { slug: 'sme-panindio', anchor: 'built' },
    stack: ['React Native', 'Expo', 'TypeScript'],
    engagement: ph('Timeline and pricing'),
  },
];
