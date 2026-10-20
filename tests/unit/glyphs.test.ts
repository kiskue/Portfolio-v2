import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  House,
  Languages,
  Minus,
  Play,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { createElement, isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import { RGlyph, type RGlyphProps } from '@/components/replicas/kit';
import { Icon } from '@/components/ui/icon';
import { ICONS } from '@/components/ui/icon-registry';
import type { IconName } from '@/content/types';
import { lucideIconData, renderLucideSvg, type LucideSvgProps } from '@/lib/lucide-node';

/*
 * Server-rendered glyphs (src/lib/lucide-node.ts). lucide-react's Icon is a 'use client' module,
 * so a lucide component rendered from a Server Component is a client reference that hydrates
 * and carries its icon data in the RSC payload. The site draws glyphs as plain SVG instead:
 * - the SVG must be exactly what lucide-react renders (same attributes, classes, aria rule);
 * - no replica file may render a lucide-react component as JSX (screens go through the kit),
 *   and no other component or production page may either (they use Icon or renderLucideSvg).
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const toPosix = (path: string): string => path.replaceAll('\\', '/');

/** lucide-react's own server markup for an icon. */
function lucideMarkup(icon: LucideIcon, props: LucideSvgProps): string {
  return renderToStaticMarkup(createElement(icon, props));
}

// ─── Markup parity ───────────────────────────────────────────────────────────────────────

describe('renderLucideSvg', () => {
  it.each<[string, LucideIcon, LucideSvgProps]>([
    ['House (alias class lucide-home), defaults', House, {}],
    ['ShieldCheck at 18', ShieldCheck, { size: 18 }],
    ['Bell at 24', Bell, { size: 24 }],
    ['ChevronRight, stroke 2.5', ChevronRight, { size: 16, strokeWidth: 2.5 }],
    ['Play, filled', Play, { size: 18, fill: 'currentColor' }],
    ['CircleAlert, coloured stroke', CircleAlert, { size: 16, color: '#c62828' }],
    ['Languages, classes deduplicated', Languages, { size: 12, className: 'a  b a lucide' }],
    ['Trash2, absolute stroke width', Trash2, { size: 48, strokeWidth: 2, absoluteStrokeWidth: true }],
    ['Check, width and height', Check, { width: 10, height: 20, strokeWidth: 3 }],
    ['House, labelled (no aria-hidden)', House, { size: 20, strokeWidth: 1.75, role: 'img', 'aria-label': 'Home', className: 'shrink-0' }],
    ['Minus, explicit aria-hidden and style', Minus, { 'aria-hidden': 'true', style: { color: 'red' }, className: 'shrink-0' }],
    ['ChevronDown, labelled by another element', ChevronDown, { 'aria-labelledby': 'menu-label' }],
  ])('%s: the same markup as lucide-react', (_label, icon, props) => {
    expect(renderToStaticMarkup(renderLucideSvg(icon, props))).toBe(lucideMarkup(icon, props));
  });

  it('is a plain <svg> host element with host children: no client component to hydrate', () => {
    const element = renderLucideSvg(House, { size: 20 });
    expect(element.type).toBe('svg');
    const children = (element.props as { readonly children?: readonly unknown[] }).children ?? [];
    expect(children.length).toBeGreaterThan(0);
    for (const child of children) {
      expect(isValidElement(child)).toBe(true);
      expect(typeof (child as ReactElement).type).toBe('string');
    }
  });

  it('reads the icon data once per icon (cached) and rejects anything that is not a lucide icon', () => {
    const data = lucideIconData(House);
    expect(data).toMatchObject({ name: 'house', size: 24, aliases: ['home'] });
    expect(data.node.length).toBeGreaterThan(0);
    expect(lucideIconData(House)).toBe(data);
    const notAnIcon = (() => null) as unknown as LucideIcon;
    expect(() => lucideIconData(notAnIcon)).toThrow(/not a lucide-react icon/);
  });
});

describe('Icon (ui) and RGlyph (replica kit)', () => {
  it('Icon renders every registry icon exactly as the lucide component did (decorative and labelled)', () => {
    for (const name of Object.keys(ICONS) as IconName[]) {
      const glyph = ICONS[name];
      expect(renderToStaticMarkup(createElement(Icon, { name })), name).toBe(
        lucideMarkup(glyph, { size: 20, strokeWidth: 1.75, 'aria-hidden': 'true', className: 'shrink-0' }),
      );
    }
    expect(renderToStaticMarkup(createElement(Icon, { name: 'mail', size: 16, label: 'Email', strokeWidth: 2, className: 'text-ink' }))).toBe(
      lucideMarkup(ICONS.mail, { size: 16, strokeWidth: 2, role: 'img', 'aria-label': 'Email', className: 'shrink-0 text-ink' }),
    );
  });

  it.each<[string, RGlyphProps, LucideSvgProps]>([
    ['a sized glyph', { icon: Bell, size: 24 }, { size: 24 }],
    ['a thick glyph', { icon: Check, size: 13, strokeWidth: 3 }, { size: 13, strokeWidth: 3 }],
    ['a filled glyph', { icon: Play, size: 18, fill: 'currentColor' }, { size: 18, fill: 'currentColor' }],
    ['a coloured glyph', { icon: CircleAlert, size: 9, color: '#475569' }, { size: 9, color: '#475569' }],
    ['a styled glyph', { icon: House, className: 'rx-x', style: { opacity: 0.5 } }, { className: 'rx-x', style: { opacity: 0.5 } }],
  ])('RGlyph draws %s exactly as lucide-react would', (_label, props, lucideProps) => {
    expect(renderToStaticMarkup(createElement(RGlyph, props))).toBe(lucideMarkup(props.icon, lucideProps));
  });
});

// ─── Source scan ─────────────────────────────────────────────────────────────────────────

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [toPosix(path)] : [];
  });
}

const REPLICA_DIR = toPosix(join(ROOT, 'src/components/replicas/'));
const DEV_DIR = toPosix(join(ROOT, 'src/app/dev/'));
const SCANNED = [...sourceFiles(join(ROOT, 'src/components')), ...sourceFiles(join(ROOT, 'src/app')).filter((file) => !file.startsWith(DEV_DIR))];

/** A replica file that breaks the rule in every way the scan must catch (never written to disk). */
const FIXTURE_PATH = `${REPLICA_DIR}__glyph-scan-fixture__.tsx`;
const FIXTURE = `
import { Bell, type LucideIcon } from 'lucide-react';
import * as lucide from 'lucide-react';
import { RGlyph } from '@/components/replicas/kit';
const MAP = { bell: Bell } as const;
export function Direct() { return <Bell size={12} />; }
export function Namespaced() { return <lucide.House />; }
export function FromProp({ icon: Glyph }: { readonly icon: LucideIcon }) { return <Glyph />; }
export function FromMap({ which }: { readonly which: keyof typeof MAP }) { const Glyph = MAP[which]; return <Glyph />; }
export function Allowed({ icon }: { readonly icon: LucideIcon }) { return <RGlyph icon={icon} size={12} />; }
`;

/** Props types of lucide components: only lucide's LucideProps has absoluteStrokeWidth. */
function rendersLucide(checker: ts.TypeChecker, tag: ts.JsxTagNameExpression): boolean {
  const type = checker.getTypeAtLocation(tag);
  const members = type.isUnion() ? type.types : [type];
  return members.some((member) =>
    [...member.getCallSignatures(), ...member.getConstructSignatures()].some((signature) => {
      const [props] = signature.getParameters();
      return props !== undefined && checker.getTypeOfSymbolAtLocation(props, tag).getProperty('absoluteStrokeWidth') !== undefined;
    }),
  );
}

/** Every JSX element in `files` whose tag is a lucide-react component, as "file:line <Tag>". */
function lucideJsx(): Map<string, string[]> {
  const config = ts.readConfigFile(join(ROOT, 'tsconfig.json'), (path) => ts.sys.readFile(path));
  const options = { ...ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT).options, noEmit: true, incremental: false };
  const host = ts.createCompilerHost(options);
  const { fileExists, readFile, getSourceFile } = host;
  host.fileExists = (name) => toPosix(name) === FIXTURE_PATH || fileExists.call(host, name);
  host.readFile = (name) => (toPosix(name) === FIXTURE_PATH ? FIXTURE : readFile.call(host, name));
  host.getSourceFile = (name, language, onError, create) =>
    toPosix(name) === FIXTURE_PATH
      ? ts.createSourceFile(name, FIXTURE, language, true, ts.ScriptKind.TSX)
      : getSourceFile.call(host, name, language, onError, create);
  const program = ts.createProgram([...SCANNED, FIXTURE_PATH], options, host);
  const checker = program.getTypeChecker();
  const found = new Map<string, string[]>();
  for (const file of [...SCANNED, FIXTURE_PATH]) {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`not in the program: ${file}`);
    const hits: string[] = [];
    const visit = (node: ts.Node): void => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && rendersLucide(checker, node.tagName)) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        hits.push(`${relative(ROOT, file).replaceAll('\\', '/')}:${line + 1} <${node.tagName.getText(source)}>`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    found.set(file, hits);
  }
  return found;
}

describe('no lucide-react component is rendered as JSX', () => {
  let found = new Map<string, string[]>();
  // Type-checking the scanned files takes a few seconds.
  beforeAll(() => {
    found = lucideJsx();
  }, 60_000);
  const hits = (filter: (file: string) => boolean): string[] => [...found].filter(([file]) => filter(file)).flatMap(([, list]) => list);

  it('the scan catches direct, namespaced, prop-bound and map-bound glyphs (self-check)', () => {
    expect(found.get(FIXTURE_PATH)?.map((hit) => hit.replace(/^.*:(\d+) /, '$1 '))).toEqual([
      '6 <Bell>',
      '7 <lucide.House>',
      '8 <Glyph>',
      '9 <Glyph>',
    ]);
  });

  it('in any replica file: screens and the kit draw glyphs through RGlyph or an `icon: LucideIcon` kit prop', () => {
    expect(SCANNED.filter((file) => file.startsWith(REPLICA_DIR)).length).toBeGreaterThan(10);
    expect(hits((file) => file.startsWith(REPLICA_DIR) && file !== FIXTURE_PATH)).toEqual([]);
  });

  it('in any other component or production page: they use Icon (ui) or renderLucideSvg (src/lib/lucide-node)', () => {
    expect(hits((file) => !file.startsWith(REPLICA_DIR))).toEqual([]);
  });
});
