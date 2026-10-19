// STUB — owned by W2, replaced in wave 1
import type { CaseStudy } from '@/content/types';

export const smePanindio: CaseStudy = {
  slug: 'sme-panindio',
  app: 'sme',
  projectSlug: 'sme-panindio',
  eyebrow: ['Personal product', 'Private beta'],
  title: 'SME Panindio',
  summary:
    'An offline-first business app for Filipino micro-businesses: POS, inventory, an utang (credit) ledger and real profit, with a suki storefront and a rider app in the same binary.',
  heroStats: ['route-screens', 'personas', 'ai-endpoints'],
  hero: {
    glimpse: 'hero.sme-panindio',
    flanks: [
      { kind: 'replica', figure: '1.4' },
      { kind: 'replica', figure: '1.5' },
    ],
    caption: 'One binary, three personas.',
  },
  glance: {
    role: ['Solo', 'product, design, mobile, backend and AI'],
    context: ['Personal product'],
    platforms: ['iOS & Android', 'Expo SDK 54', 'React Native 0.81'],
    stack: ['TypeScript', 'Expo Router', 'Zustand', 'expo-sqlite', 'Socket.IO', 'NestJS', 'MySQL', 'FastAPI'],
    status: ['Private beta', 'not on public stores yet'],
    timeline: 'Dec 2025 – present',
    links: [],
  },
  confirm: 'The timeline comes from git history; confirm it, and whether the repo can be linked.',
  problem: {
    paragraphs: [
      'Small Filipino shops run on paper notebooks: sales, stock and utang (store credit) rarely add up to a real profit figure, and the data connection is not always there.',
    ],
    constraints: ['Works fully offline', 'Three personas in one app', 'English and Tagalog'],
  },
  features: [
    {
      id: 'owner-dashboard',
      title: 'Owner dashboard and real P&L',
      body: 'Profit after cost of goods, waste and overhead, computed on the phone.',
      screen: { kind: 'replica', figure: '1.1' },
    },
  ],
  specials: [
    {
      kind: 'ai',
      title: 'Numbers on the phone, words in the cloud',
      figures: ['1.6', '1.7', '1.8'],
      guardrails: ['The phone computes every number; the model only explains them.', 'The AI declines when the data is missing.'],
      diagram: {
        id: 'sme-ai-pipeline',
        title: 'SME AI pipeline',
        lanes: [
          {
            id: 'phone',
            title: 'Phone',
            owner: 'me',
            nodes: [
              { id: 'sqlite', label: 'On-device SQLite', owner: 'me' },
              { id: 'math', label: 'Deterministic math', owner: 'me' },
            ],
            note: 'Offline, a computed sentence always shows; AI only enhances it.',
          },
          {
            id: 'service',
            title: 'AI service',
            owner: 'me',
            nodes: [{ id: 'prompt', label: 'Grounded prompt by kind', owner: 'me' }],
          },
          {
            id: 'models',
            title: 'Models',
            owner: 'external',
            nodes: [
              { id: 'gemini', label: 'Google Gemini', owner: 'external' },
              { id: 'ollama', label: 'Open-weights fallback via Ollama', owner: 'external' },
            ],
          },
        ],
        connectors: [{ label: 'HTTPS, signed-in owner' }, { label: 'Model API' }],
      },
    },
  ],
  screens: [
    { kind: 'replica', figure: '1.1' },
    { kind: 'replica', figure: '1.2' },
    { kind: 'replica', figure: '1.5' },
    { kind: 'replica', figure: '1.6' },
  ],
  architecture: [
    {
      id: 'sme-offline-first',
      title: 'Offline-first data',
      lanes: [
        { id: 'phone', title: 'Phone', owner: 'me', nodes: [{ id: 'sqlite', label: 'On-device SQLite', owner: 'me' }] },
        { id: 'server', title: 'Server', owner: 'me', nodes: [{ id: 'api', label: 'NestJS API', owner: 'me' }] },
      ],
      connectors: [{ label: 'Syncs when online' }],
    },
  ],
  challenges: [
    {
      id: 'ai-cannot-invent',
      title: 'AI that can’t invent your numbers',
      problem: 'A language model asked about profit will happily make up a figure.',
      did: 'The phone computes every number and sends a snapshot; the model may only explain it, and must decline when data is missing.',
      proof: 'The chat declines to guess restock amounts that are not in the snapshot.',
      flagship: true,
    },
  ],
  metrics: [
    { id: 'route-screens', value: '64', label: 'route screens', source: 'Counted in the app repository', asOf: '2026-10-19' },
    { id: 'personas', value: '3', label: 'personas in one app', source: 'Counted in the app repository', asOf: '2026-10-19' },
    { id: 'ai-endpoints', value: '6', label: 'grounded AI endpoints', source: 'Counted in the AI service', asOf: '2026-10-19' },
  ],
  gaps: ['An output-side check that every number in an AI reply matches the phone’s figures.'],
  sections: ['overview', 'problem', 'built', 'ai', 'screens', 'architecture', 'challenges', 'numbers', 'next'],
};
