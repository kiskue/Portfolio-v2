import type { SkillTier } from '@/content/types';

/**
 * Skill tiers (design §8, with V1's tier blurbs). Tier placement is a claim about my own ability,
 * so every tier carries a confirm note for review. Each item is backed by work listed in
 * projects.ts or on the V1 site (C# / ASP.NET is from university, per V1).
 */
export const skills: readonly SkillTier[] = [
  {
    depth: 'core',
    label: 'Core',
    blurb: 'I build production features in these unsupervised.',
    items: [
      'React Native',
      'Expo (Router, EAS)',
      'TypeScript',
      'React',
      'Tailwind CSS / NativeWind',
      'Zustand',
      'TanStack Query',
      'Socket.IO',
      'REST APIs',
      'Git',
    ],
    confirm: 'Review the core tier: only what you would build with unsupervised.',
  },
  {
    depth: 'production',
    label: 'Production-tested',
    blurb: 'Shipped and comfortable, still deepening.',
    items: [
      'WebRTC',
      'SQLite',
      'NestJS',
      'Node.js / Express',
      'MySQL',
      'expo-maps / MapLibre',
      'Expo push notifications',
      'i18next',
      'Jest',
      'Storybook',
      'GitHub Actions / EAS Workflows',
      'Next.js',
    ],
    confirm:
      'Review the production tier. Next.js is here because of the analytics app and this site; move it down if that feels generous.',
  },
  {
    depth: 'working',
    label: 'Working knowledge',
    blurb: 'Used on delivered work; I’d ramp up with support.',
    items: [
      'Python / FastAPI / Pydantic',
      'LLM integration (Gemini, Ollama)',
      'Kotlin Expo Modules',
      'Chrome extensions (MV3)',
      'Vitest',
      'Zod',
      'Redux',
      'Ant Design',
      'Firebase',
      'C# / ASP.NET',
    ],
    confirm: 'Review the working-knowledge tier.',
  },
];
