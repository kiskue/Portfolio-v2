// STUB — owned by W2, replaced in wave 1
import type { CaseStudy } from '@/content/types';
import { ph } from '@/lib/placeholder';

export const defensysCitizen: CaseStudy = {
  slug: 'defensys-citizen',
  app: 'citizen',
  projectSlug: 'defensys-citizen',
  eyebrow: ['Company', 'Dynamic Global Soft Inc.', 'Live on the stores'],
  title: 'Defensys Citizen',
  summary:
    'One white-label React Native app that ships under several local-government brands: one-tap SOS video calls to the command center, geotagged reports and live hazard alerts.',
  heroStats: ['brands-configured', 'feature-flags', 'routed-screens'],
  hero: {
    glimpse: 'hero.defensys-citizen',
    flanks: [
      { kind: 'replica', figure: '2.1', brand: '1hope' },
      { kind: 'replica', figure: '2.1', brand: 'sjdm-app' },
    ],
  },
  glance: {
    role: [ph('Your title at DGSI'), 'I build and maintain the mobile app; the DGSI team builds the command center and API.'],
    context: ['Company', 'Dynamic Global Soft Inc.'],
    platforms: ['iOS & Android', 'Expo SDK 55', 'React Native 0.83', 'TypeScript'],
    stack: ['TypeScript', 'Expo Router', 'NativeWind', 'Zustand', 'TanStack Query', 'Socket.IO', 'WebRTC'],
    status: ['Live on Google Play and the App Store'],
    timeline: ph('YYYY – present'),
    links: [],
  },
  problem: {
    paragraphs: [
      'In an emergency, residents need one tap to reach their local command center, and each local government wants its own branded app without paying for a separate codebase.',
    ],
    constraints: ['One codebase, many brands', 'Works on weak signal', 'English and Filipino'],
  },
  features: [
    {
      id: 'sos',
      title: 'One-tap SOS with a cancellable countdown',
      body: 'A large SOS control, then five seconds to cancel an accidental tap before the call starts.',
      screen: { kind: 'replica', figure: '2.3' },
    },
  ],
  specials: [
    {
      kind: 'brands',
      app: 'citizen',
      caption: 'Brand colors re-skin headers, tabs and buttons. Emergency colors never change, by design.',
    },
  ],
  screens: [
    { kind: 'replica', figure: '2.1' },
    { kind: 'replica', figure: '2.3' },
    { kind: 'replica', figure: '2.4' },
    { kind: 'replica', figure: '2.5' },
  ],
  architecture: [
    {
      id: 'defensys-ecosystem',
      title: 'The Defensys ecosystem',
      lanes: [
        { id: 'citizens', title: 'Citizens', owner: 'me', nodes: [{ id: 'citizen-app', label: 'Citizen app', owner: 'me' }] },
        {
          id: 'platform',
          title: 'Platform core',
          owner: 'team',
          nodes: [
            {
              id: 'api',
              label: 'Defensys API',
              owner: 'team',
              detail: 'Built by the DGSI team; I added the AI weather safety brief and facility-suggestion endpoints.',
            },
            { id: 'command-center', label: 'Command Center web console', owner: 'team' },
          ],
        },
        { id: 'field', title: 'Field', owner: 'me', nodes: [{ id: 'responder-app', label: 'Responder app', owner: 'me' }] },
      ],
      connectors: [
        { label: 'SOS video call through the dispatcher queue · tickets and chat · hazards and news' },
        { label: 'Dispatch assignment · live location · incident room and push-to-talk' },
      ],
      sideNote: 'Citizens and responders join the same agent queue.',
    },
  ],
  challenges: [
    {
      id: 'sos-weak-signal',
      title: 'SOS that survives a weak signal',
      problem: 'An emergency call has to start even when the signal is poor or the location is not ready yet.',
      did: 'SOS joins the command center’s dispatcher queue directly and recovers the call on its own if the signal drops; it works before a location fix and with the camera off.',
      proof: 'Shipped in the current release on Google Play and the App Store.',
      flagship: true,
    },
  ],
  metrics: [
    { id: 'brands-configured', value: '8', label: 'brands configured', source: 'Counted in the white-label config', asOf: '2026-10-19' },
    { id: 'feature-flags', value: '11', label: 'server-controlled feature flags', source: 'Counted in the app repository', asOf: '2026-10-19' },
    { id: 'routed-screens', value: '24', label: 'routed screens', source: 'Counted in the app repository', asOf: '2026-10-19' },
  ],
  gaps: ['Two brands still ship the default palette instead of their own colors.'],
  sections: ['overview', 'problem', 'built', 'brands', 'screens', 'architecture', 'challenges', 'numbers', 'next'],
};
