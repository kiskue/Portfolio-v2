import type { Tool } from '@/content/types';

/**
 * The "Tools I work with" strip (design §4.2): exactly 20 tools, in strip order, each backed by
 * evidence from a repo or a project.
 *
 * Glyphs are simple-icons where the brand exists in simple-icons 16.35.0. React Native uses the
 * React glyph with the label "React Native" (simple-icons has no React Native mark). Zustand is
 * absent, so it gets a monogram tile.
 *
 * `evidence` is build-time data: never rendered and never passed to a client island (the strip
 * needs only `label` and `glyph`).
 */

/** Why a tool is on the strip: the receipt behind the claim. */
export interface ToolEvidence {
  /** Slugs from projects.ts that use the tool (tested to resolve). */
  readonly projects: readonly string[];
  /** Repositories that have no project card, by name. */
  readonly repos?: readonly string[];
  /** Where the tool shows up, in plain words. */
  readonly note: string;
}

/** A strip tool plus its evidence. Assignable to `Tool`, so the UI can ignore `evidence`. */
export interface EvidencedTool extends Tool {
  readonly evidence: ToolEvidence;
}

const APPS = ['sme-panindio', 'defensys-citizen', 'defensys-responder'] as const;

export const tools: readonly EvidencedTool[] = [
  {
    id: 'expo',
    label: 'Expo · EAS',
    glyph: { kind: 'si', icon: 'siExpo' },
    evidence: {
      projects: [...APPS],
      note: 'All three case-study apps are Expo apps (SDK 54 and 55) built with EAS Build, per brand for the Defensys apps; Defensys Citizen also ships through EAS Submit, Update and Workflows.',
    },
  },
  {
    id: 'react-native',
    label: 'React Native',
    glyph: { kind: 'si', icon: 'siReact' },
    evidence: {
      projects: [...APPS, 'eventbook-exhibitors'],
      note: 'The runtime of all three case-study apps (React Native 0.81 and 0.83; SME and Responder on the New Architecture).',
    },
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    glyph: { kind: 'si', icon: 'siTypescript' },
    evidence: {
      projects: [...APPS, 'dynamic-data-analytics'],
      note: 'All three apps (strict in SME and Responder), the SME backend and the analytics app.',
    },
  },
  {
    id: 'nextjs',
    label: 'Next.js',
    glyph: { kind: 'si', icon: 'siNextdotjs' },
    evidence: {
      projects: ['dynamic-data-analytics'],
      repos: ['Portfolio V2 (this site)'],
      note: 'Next.js 16 App Router and route handlers in the analytics app; this site is Next.js too.',
    },
  },
  {
    id: 'tailwind',
    label: 'Tailwind · NativeWind',
    glyph: { kind: 'si', icon: 'siTailwindcss' },
    evidence: {
      projects: ['defensys-citizen', 'defensys-responder', 'dynamic-data-analytics'],
      note: 'NativeWind in the Defensys apps, with each brand’s palette baked in at build time; Tailwind CSS 4 on the web.',
    },
  },
  {
    id: 'tanstack-query',
    label: 'TanStack Query',
    glyph: { kind: 'si', icon: 'siReactquery' },
    evidence: {
      projects: ['defensys-citizen', 'defensys-responder', 'dynamic-data-analytics'],
      note: 'Server state and caching in the Defensys apps (Responder refetches on reconnect).',
    },
  },
  {
    id: 'zustand',
    label: 'Zustand',
    glyph: { kind: 'monogram', text: 'Z' },
    evidence: {
      projects: [...APPS],
      note: 'Client stores in all three apps: auth, calls, location, channels and the SME business data.',
    },
  },
  {
    id: 'socketio',
    label: 'Socket.IO',
    glyph: { kind: 'si', icon: 'siSocketdotio' },
    evidence: {
      projects: [...APPS],
      note: 'Dispatch, presence, live location, chat and feature flags in the Defensys apps; live orders and rider tracking in SME.',
    },
  },
  {
    id: 'webrtc',
    label: 'WebRTC',
    glyph: { kind: 'si', icon: 'siWebrtc' },
    evidence: {
      projects: ['defensys-citizen', 'defensys-responder'],
      note: 'SOS video calls through a dispatcher queue; responder calls and the live incident room.',
    },
  },
  {
    id: 'sqlite',
    label: 'SQLite',
    glyph: { kind: 'si', icon: 'siSqlite' },
    evidence: {
      projects: ['sme-panindio', 'defensys-responder'],
      note: 'The SME books live in on-device SQLite with versioned migrations; Responder keeps offline responses and reports in it.',
    },
  },
  {
    id: 'nestjs',
    label: 'NestJS',
    glyph: { kind: 'si', icon: 'siNestjs' },
    evidence: {
      projects: ['sme-panindio'],
      note: 'The SME backend: REST API, realtime gateway, the server half of backups and the AI proxy.',
    },
  },
  {
    id: 'fastapi',
    label: 'FastAPI',
    glyph: { kind: 'si', icon: 'siFastapi' },
    evidence: {
      projects: ['sme-panindio'],
      note: 'The SME AI service, with Pydantic models and size caps on every request.',
    },
  },
  {
    id: 'mysql',
    label: 'MySQL',
    glyph: { kind: 'si', icon: 'siMysql' },
    evidence: {
      projects: ['sme-panindio'],
      note: 'The SME backend database.',
    },
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    glyph: { kind: 'si', icon: 'siGooglegemini' },
    evidence: {
      projects: ['sme-panindio'],
      note: 'The primary model provider of the SME AI service.',
    },
  },
  {
    id: 'ollama',
    label: 'Ollama',
    glyph: { kind: 'si', icon: 'siOllama' },
    evidence: {
      projects: ['sme-panindio'],
      note: 'The open-weights fallback via Ollama in the SME AI service.',
    },
  },
  {
    id: 'maplibre',
    label: 'MapLibre',
    glyph: { kind: 'si', icon: 'siMaplibre' },
    evidence: {
      projects: ['sme-panindio'],
      note: 'The 3D navigation map in the SME rider app.',
    },
  },
  {
    id: 'storybook',
    label: 'Storybook',
    glyph: { kind: 'si', icon: 'siStorybook' },
    evidence: {
      projects: ['sme-panindio'],
      note: 'An on-device component catalog for the SME app.',
    },
  },
  {
    id: 'jest',
    label: 'Jest',
    glyph: { kind: 'si', icon: 'siJest' },
    evidence: {
      projects: ['sme-panindio'],
      note: 'Unit, SQL-level and render tests for the SME app.',
    },
  },
  {
    id: 'github-actions',
    label: 'GitHub Actions',
    glyph: { kind: 'si', icon: 'siGithubactions' },
    evidence: {
      projects: ['sme-panindio'],
      note: 'CI for the SME app, with the test suite as the gate.',
    },
  },
  {
    id: 'vercel',
    label: 'Vercel',
    glyph: { kind: 'si', icon: 'siVercel' },
    evidence: {
      projects: [],
      repos: ['Portfolio V1', 'Portfolio V2 (this site)'],
      note: 'The first version of this portfolio deploys on Vercel, and this site is built to deploy there too.',
    },
    confirm:
      'Vercel has the weakest evidence on the strip (your portfolio deploys there). Keep it, or swap in Claude Code if you want AI tooling shown.',
  },
];
