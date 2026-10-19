// STUB — owned by W2, replaced in wave 1
import type { CaseStudy } from '@/content/types';
import { ph } from '@/lib/placeholder';

export const defensysResponder: CaseStudy = {
  slug: 'defensys-responder',
  app: 'responder',
  projectSlug: 'defensys-responder',
  eyebrow: ['Company', 'DGSI', 'Private distribution'],
  title: 'Defensys Responder',
  summary:
    'The field app for LGU emergency responders: live dispatch, road navigation, push-to-talk and video with the command center, built to keep working on patchy signal.',
  heroStats: ['notification-channels', 'offline-fixes', 'brands'],
  hero: {
    glimpse: 'hero.defensys-responder',
    flanks: [
      { kind: 'replica', figure: '3.4' },
      { kind: 'replica', figure: '3.6' },
    ],
  },
  glance: {
    role: [ph('Your title at DGSI'), 'I built the white-label app.'],
    context: ['Company', 'Dynamic Global Soft Inc.'],
    platforms: ['iOS & Android', 'Expo SDK 55', 'React Native 0.83', 'TypeScript'],
    stack: ['TypeScript', 'Expo Router', 'Socket.IO', 'WebRTC', 'expo-location'],
    status: ['Private distribution'],
    timeline: ph('YYYY – present'),
    links: [],
  },
  problem: {
    paragraphs: ['Field responders need dispatches, directions and team radio on one phone that keeps working on patchy signal.'],
    constraints: ['Usable with gloves and in sunlight', 'Keeps working offline', 'One codebase, several brands'],
  },
  features: [
    {
      id: 'duty',
      title: 'Duty switch and presence',
      body: 'One switch makes a responder dispatchable and shares their live position with the command center.',
      screen: { kind: 'replica', figure: '3.1' },
    },
  ],
  specials: [
    {
      kind: 'brands',
      app: 'responder',
      caption: 'Brand colors re-skin headers, buttons and the map puck. Dispatch and call colors never change, by design.',
    },
  ],
  screens: [
    { kind: 'replica', figure: '3.1' },
    { kind: 'replica', figure: '3.2' },
    { kind: 'replica', figure: '3.3' },
    { kind: 'replica', figure: '3.4' },
  ],
  architecture: [
    {
      id: 'responder-location',
      title: 'Location pipeline',
      lanes: [
        {
          id: 'phone',
          title: 'Phone',
          owner: 'me',
          nodes: [
            { id: 'capture', label: 'Capture every 5 s or 10 m', owner: 'me' },
            { id: 'backlog', label: 'Offline backlog', owner: 'me', detail: 'Up to 1,000 fixes' },
          ],
        },
        {
          id: 'command-center',
          title: 'Command center',
          owner: 'team',
          nodes: [{ id: 'live-map', label: 'Live map', owner: 'team' }],
        },
      ],
      connectors: [{ label: 'Upload every 60 s or 100 m; batch flush on reconnect' }],
    },
  ],
  challenges: [
    {
      id: 'chat-vs-dispatch',
      title: 'A chat ping must never sound like a dispatch',
      problem: 'Responders get many notifications a shift; a dispatch has to cut through and a chat message must not.',
      did: 'Separate notification channels with their own sound and importance, so a dispatch rings like a siren and chat stays quiet.',
      proof: 'Six notification channels.',
      flagship: true,
    },
  ],
  metrics: [
    { id: 'notification-channels', value: '6', label: 'notification channels', source: 'Counted in the app repository', asOf: '2026-10-19' },
    { id: 'offline-fixes', value: '≤1,000', label: 'location fixes buffered offline', source: 'Counted in the app repository', asOf: '2026-10-19' },
    { id: 'brands', value: '4 + demo', label: 'brands plus a demo build', source: 'Counted in the white-label config', asOf: '2026-10-19' },
  ],
  gaps: ['Channels screen sharing and drawing are still in rollout.'],
  sections: ['overview', 'problem', 'built', 'brands', 'screens', 'architecture', 'challenges', 'numbers', 'next'],
};
