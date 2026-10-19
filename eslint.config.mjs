import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/*
 * Folder boundaries (architecture D1). In flat config, when two objects set the same rule
 * for a file, the later object's options REPLACE the earlier ones, so every boundary object
 * below carries the complete pattern list for the files it matches.
 *
 * Boundaries are written against the `@/` alias. Parent-relative imports (`../`) are banned
 * inside src/ so that every cross-folder import goes through the alias and gets checked.
 */

const REPLICA_APPS = ['sme', 'citizen', 'responder'];
const SECTION_PAGES = [
  'home',
  'case-study',
  'projects',
  'showcase',
  'services',
  'testimonials',
  'about',
  'contact',
];

const bannedPackages = {
  paths: [
    { name: 'next-themes', message: 'Use src/lib/display-settings.ts and the inline pre-paint script.' },
    { name: 'framer-motion', message: 'Motion is CSS plus native View Transitions (PLAN.md).' },
    { name: 'motion', message: 'Motion is CSS plus native View Transitions (PLAN.md).' },
    { name: 'motion/react', message: 'Motion is CSS plus native View Transitions (PLAN.md).' },
  ],
  patterns: [
    {
      regex: '^(next-themes|framer-motion|motion)/',
      caseSensitive: true,
      message: 'next-themes, framer-motion and motion are not used (PLAN.md).',
    },
  ],
};

const noParentImports = {
  regex: '^\\.\\./',
  caseSensitive: true,
  message: 'Import from outside this folder with the @/ alias so folder boundaries can be linted.',
};

/** A regex pattern entry for @typescript-eslint/no-restricted-imports. */
const deny = (regex, message, extra = {}) => ({ regex, caseSensitive: true, message, ...extra });

const alt = (names) => names.join('|');

const replicaBase = deny(
  '^@/components/(ui|layout|sections)(/|$)',
  'Replicas have their own design language: use replicas/kit, lucide-react, lib and content types.',
);

/** @param {string} files @param {{ paths?: object[], patterns?: object[] }} options */
const boundary = (files, options) => ({
  files: [files],
  rules: { '@typescript-eslint/no-restricted-imports': ['error', options] },
});

const boundaries = [
  boundary('src/content/**', {
    paths: [
      { name: 'react', message: 'content/** is pure data: no React.' },
      { name: 'react-dom', message: 'content/** is pure data: no React.' },
      { name: 'next', allowTypeImports: true, message: 'content/** may only `import type` from next.' },
    ],
    patterns: [
      deny('^react(-dom)?/', 'content/** is pure data: no React.'),
      deny('^next/', 'content/** may only `import type` from next.', { allowTypeImports: true }),
      deny('^@/(components|hooks|app)(/|$)', 'content/** is pure data: no components, hooks or routes.'),
      deny('^(lucide-react|radix-ui)(/|$)|^@radix-ui/', 'content/** refers to icons by key, never components.'),
    ],
  }),
  boundary('src/lib/**', {
    patterns: [deny('^@/(components|hooks|app)(/|$)', 'lib/** holds pure functions: no components, hooks or routes.')],
  }),
  boundary('src/components/ui/**', {
    patterns: [
      deny(
        '^@/components/(layout|sections|showcase|replicas)(/|$)',
        'ui/** primitives may not import layout, sections, showcase or replicas.',
      ),
    ],
  }),
  boundary('src/components/content/**', {
    patterns: [deny('^@/components/sections(/|$)', 'Shared content blocks may not import page sections.')],
  }),
  boundary('src/components/replicas/**', { patterns: [replicaBase] }),
  boundary('src/components/replicas/kit/**', {
    patterns: [
      replicaBase,
      deny(`^@/components/replicas/(${alt(REPLICA_APPS)})(/|$)`, 'The replica kit is shared: it may not import app folders.'),
    ],
  }),
  ...REPLICA_APPS.map((app) =>
    boundary(`src/components/replicas/${app}/**`, {
      patterns: [
        replicaBase,
        deny(
          `^@/components/replicas/(${alt(REPLICA_APPS.filter((other) => other !== app))})(/|$)`,
          `replicas/${app} may not import another app's replicas; share through replicas/kit.`,
        ),
      ],
    }),
  ),
  // Section folders not listed in SECTION_PAGES still may not reach into the known pages.
  boundary('src/components/sections/**', {
    patterns: [
      deny(
        `^@/components/sections/(${alt(SECTION_PAGES)})(/|$)`,
        'Sections are never imported across pages; promote shared blocks to components/content.',
      ),
    ],
  }),
  ...SECTION_PAGES.map((page) =>
    boundary(`src/components/sections/${page}/**`, {
      patterns: [
        deny(
          `^@/components/sections(/(?!${page}(/|$))|$)`,
          'Sections are never imported across pages; promote shared blocks to components/content.',
        ),
      ],
    }),
  ),
];

const hexColour = '#[0-9a-fA-F]{3,8}\\b';
const hexMessage =
  'No hex colours here: use the tokens in src/styles/tokens.css (brand colours come from content/apps/brands.ts).';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: 'portfolio/banned-packages',
    rules: { 'no-restricted-imports': ['error', bannedPackages] },
  },
  {
    name: 'portfolio/src-alias-imports',
    files: ['src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: bannedPackages.paths, patterns: [...bannedPackages.patterns, noParentImports] },
      ],
    },
  },
  ...boundaries.map((entry, index) => ({ name: `portfolio/boundary-${index}`, ...entry })),
  {
    name: 'portfolio/no-hex-colours',
    files: [
      'src/components/ui/**',
      'src/components/layout/**',
      'src/components/content/**',
      'src/components/sections/**',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${hexColour}/]`, message: hexMessage },
        { selector: `TemplateElement[value.raw=/${hexColour}/]`, message: hexMessage },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'public/**',
    'next-env.d.ts',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
    'blob-report/**',
    '.planning/**',
    '.cache/**',
  ]),
]);
