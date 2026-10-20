import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
 * Server-only guardrail. src/content/apps/store.ts (zod plus the store JSON) and
 * src/content/derived.ts start with `import 'server-only'`, so a client import of either is a
 * build error. This test finds the same problem earlier and names the import chain: no module
 * marked 'use client' may reach a server-only module through its value imports. Client islands
 * receive store facts and derived values as props or as server-rendered children instead.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(ROOT, 'src');
const toPosix = (path: string): string => path.replaceAll('\\', '/');
const rel = (path: string): string => toPosix(relative(ROOT, path));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [path] : [];
  });
}

const parsed = new Map<string, ts.SourceFile>();
function parse(file: string): ts.SourceFile {
  let source = parsed.get(file);
  if (!source) {
    source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    parsed.set(file, source);
  }
  return source;
}

function directive(source: ts.SourceFile): string | null {
  const first = source.statements[0];
  return first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) ? first.expression.text : null;
}

/** `import 'server-only'` at the top level. */
function isServerOnly(source: ts.SourceFile): boolean {
  return source.statements.some(
    (statement) => ts.isImportDeclaration(statement) && !statement.importClause && (statement.moduleSpecifier as ts.StringLiteral).text === 'server-only',
  );
}

/** Module specifiers a file imports at run time: type-only imports and re-exports are erased by the compiler. */
function valueImports(source: ts.SourceFile): string[] {
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const typeOnly =
        clause !== undefined &&
        (clause.isTypeOnly ||
          (clause.name === undefined &&
            bindings !== undefined &&
            ts.isNamedImports(bindings) &&
            bindings.elements.length > 0 &&
            bindings.elements.every((element) => element.isTypeOnly)));
      if (!typeOnly) specifiers.push((node.moduleSpecifier as ts.StringLiteral).text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly) {
      specifiers.push((node.moduleSpecifier as ts.StringLiteral).text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteral(argument)) specifiers.push(argument.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

/** A project file for an `@/…` or relative specifier; null for packages. */
function resolve(from: string, specifier: string): string | null {
  const base = specifier.startsWith('@/') ? join(SRC, specifier.slice(2)) : specifier.startsWith('.') ? join(dirname(from), specifier) : null;
  if (base === null) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(candidate) && statSync(candidate).isFile() && /\.tsx?$/.test(candidate)) return candidate;
  }
  return null;
}

/** The chain from `start` to the first server-only module it reaches, or null. */
function serverOnlyChain(start: string): string[] | null {
  const previous = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (file !== start && isServerOnly(parse(file))) {
      const chain: string[] = [];
      for (let at: string | null = file; at !== null; at = previous.get(at) ?? null) chain.unshift(rel(at));
      return chain;
    }
    for (const specifier of valueImports(parse(file))) {
      const target = resolve(file, specifier);
      if (target && !previous.has(target)) {
        previous.set(target, file);
        queue.push(target);
      }
    }
  }
  return null;
}

const files = sourceFiles(SRC);
const clientModules = files.filter((file) => directive(parse(file)) === 'use client');

describe("server-only modules never reach a 'use client' module", () => {
  it('store.ts and derived.ts are marked server-only', () => {
    for (const file of ['src/content/apps/store.ts', 'src/content/derived.ts']) {
      const source = parse(join(ROOT, file));
      expect(isServerOnly(source), file).toBe(true);
      // First statement, so nothing runs before the guard.
      const first = source.statements[0];
      expect(first && ts.isImportDeclaration(first) && (first.moduleSpecifier as ts.StringLiteral).text, file).toBe('server-only');
    }
  });

  it('finds the client modules and follows their imports (self-check)', () => {
    expect(clientModules.length).toBeGreaterThan(5);
    expect(clientModules.map(rel)).toContain('src/components/ui/copy-button.tsx');
    // derived.ts reaches store.ts, so a client module importing derived.ts would be reported.
    expect(serverOnlyChain(join(ROOT, 'src/components/showcase/screen-view.tsx'))).toEqual([
      'src/components/showcase/screen-view.tsx',
      'src/content/derived.ts',
    ]);
  });

  it('no client module imports store.ts, derived.ts or any other server-only module, directly or transitively', () => {
    const problems = clientModules.flatMap((file) => {
      const chain = serverOnlyChain(file);
      return chain ? [chain.join(' → ')] : [];
    });
    expect(problems).toEqual([]);
  });
});
