/**
 * npm run content:todo (PLAN.md "Content you supply later"; design §10 "Placeholder convention").
 *
 * Lists everything the owner still has to supply or confirm, with file and line:
 *   token    a "[[…]]" placeholder (ph('…') or a raw token string);
 *   example  an item marked `example: true` (label mode tags it, hide mode drops it);
 *   null     a nullable fact that is still null (years, CV, verified-credential and credential links);
 *   confirm  a `confirm` note (never rendered; the owner confirms the claim, then deletes the note);
 *   env      NEXT_PUBLIC_SITE_URL (the production domain) or RESEND_API_KEY not set;
 *   asset    the portrait below 1200×1480;
 *   release  site.placeholders still defaults to 'label' (switch to 'hide' to go public), listed on
 *            the line that holds the default (site.ts: the PLACEHOLDERS constant). The
 *            NEXT_PUBLIC_PLACEHOLDERS override changes one build, not the default, so it never
 *            clears this item.
 * Items inside `hidden: true` entries, the CV, and verification links are listed as optional.
 *
 * How: the content files are TypeScript with @/ imports, so they are PARSED, not run. The
 * TypeScript compiler API (the `typescript` devDependency) reads each file's syntax tree, which
 * gives exact lines without a module loader. Strings are resolved statically (literals,
 * templates, concatenation, same-file constants). tests/unit/content-todo.test.ts loads the real
 * modules through Vitest and proves the scan finds every token, example and confirm note they hold.
 *
 * Usage: node scripts/content-todo.mjs [--strict] [--json] [--github]
 *   (default)  a report grouped by file, with a total; exits 0. CI shows it as warnings.
 *   --strict   exits 1 while any required item remains (run it before a client-facing release).
 *   --json     machine-readable output.
 *   --github   also prints GitHub Actions ::warning annotations (automatic when GITHUB_ACTIONS=true).
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import ts from 'typescript';

export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CONTENT_DIR = 'src/content';
export const PORTRAIT_DIR = 'src/assets/portrait';
/** PLAN "Content you supply later": a high-resolution portrait of at least 1200×1480. */
export const PORTRAIT_MIN = Object.freeze({ width: 1200, height: 1480 });
export const KINDS = Object.freeze(['token', 'example', 'null', 'confirm', 'env', 'asset', 'release']);

/**
 * Nullable facts (content/types.ts) that mean "not supplied yet" while null. `url` only counts on
 * a credential (an object with kind 'degree' or 'certification').
 */
export const NULL_FACTS = Object.freeze({
  yearsOfExperience: { note: 'years of experience: label mode shows "[[N]]+ years", hide mode omits it', optional: false },
  cvUrl: { note: 'the CV PDF: label mode shows a placeholder chip, hide mode omits the CV link', optional: true },
  verifiedCredentialUrl: { note: 'a verified-credential link: no verified badge is shown while it is null', optional: true },
  url: { note: 'a verification link for this credential, where one exists', optional: true },
});

const CREDENTIAL_KINDS = new Set(['degree', 'certification']);
const TOKEN = /\[\[([^[\]]+)\]\]/g;
const MAX_DEPTH = 12;

/**
 * @typedef {'token' | 'example' | 'null' | 'confirm' | 'env' | 'asset' | 'release'} TodoKind
 * @typedef {{ kind: TodoKind, file: string | null, line: number | null, where: string, text: string, optional: boolean, hidden: boolean, uses?: number[] }} TodoItem
 */

// ─── Static strings ───────────────────────────────────────────────────────────────────────

function unwrap(node) {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

/** Same-file `const NAME = <initializer>` declarations, by name. */
function constInitializers(sourceFile) {
  const consts = new Map();
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0 &&
      !consts.has(node.name.text)
    ) {
      consts.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return consts;
}

/** True for `ph(…)`: the placeholder authoring helper from src/lib/placeholder.ts. */
function isPhCall(node) {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'ph' && node.arguments.length === 1;
}

/**
 * The string an expression always evaluates to, or null when it cannot be known statically:
 * literals, templates, `+` concatenation, same-file constants and ph('…') (as its token).
 */
function evaluateString(node, consts, depth = 0) {
  const current = unwrap(node);
  if (!current || depth > MAX_DEPTH) return null;
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text;
  if (ts.isNumericLiteral(current)) return String(Number(current.text));
  if (ts.isTemplateExpression(current)) {
    let text = current.head.text;
    for (const span of current.templateSpans) {
      const value = evaluateString(span.expression, consts, depth + 1);
      if (value === null) return null;
      text += value + span.literal.text;
    }
    return text;
  }
  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = evaluateString(current.left, consts, depth + 1);
    const right = left === null ? null : evaluateString(current.right, consts, depth + 1);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isIdentifier(current)) {
    const initializer = consts.get(current.text);
    return initializer ? evaluateString(initializer, consts, depth + 1) : null;
  }
  if (isPhCall(current)) {
    const inner = evaluateString(current.arguments[0], consts, depth + 1);
    return inner === null ? null : `[[${inner.trim()}]]`;
  }
  return null;
}

// ─── Where a node sits ────────────────────────────────────────────────────────────────────

function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return name.getText();
}

/** The object literal's own property initializer, by name (unwrapped), or undefined. */
function ownProperty(object, name) {
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property) && propertyName(property.name) === name) return unwrap(property.initializer);
  }
  return undefined;
}

function literalText(node) {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;
}

/** An array item's readable key: its id, slug, key or depth (skill tiers) when they are literals. */
function itemKey(object) {
  for (const name of ['id', 'slug', 'key', 'depth']) {
    const text = literalText(ownProperty(object, name));
    if (text !== null) return text;
  }
  return null;
}

/**
 * A readable path to a node, e.g. "testimonials[example-client-app].name" or
 * "profile.availability.label": property names, array items by id (or index), and the
 * declared variable at the top.
 */
function contextPath(node) {
  const parts = [];
  let child = node;
  let current = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isPropertyAssignment(current) || ts.isShorthandPropertyAssignment(current)) {
      parts.push(`.${propertyName(current.name)}`);
    } else if (ts.isArrayLiteralExpression(current)) {
      const inner = unwrap(child);
      const key = inner && ts.isObjectLiteralExpression(inner) ? itemKey(inner) : null;
      parts.push(`[${key ?? current.elements.indexOf(child)}]`);
    } else if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      parts.push(current.name.text);
      break;
    } else if (ts.isFunctionLike(current) && current.name && ts.isIdentifier(current.name)) {
      parts.push(`${current.name.text}()`);
      break;
    }
    child = current;
    current = current.parent;
  }
  const joined = parts.reverse().join('');
  return joined.startsWith('.') ? joined.slice(1) : joined;
}

/** True for `process.env.NAME` or `process.env['NAME']`. */
function isEnvRead(node) {
  if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
  const target = unwrap(node.expression);
  return ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression) && target.expression.text === 'process' && target.name.text === 'env';
}

/** Of two default sources, the one that decides: a 'label' literal, then an unreadable value. */
function decisive(first, second) {
  if (first?.label) return first;
  if (second?.label) return second;
  return first ?? second;
}

/**
 * Where a `placeholders` value gets its default mode, the one a build uses with no environment
 * override set: `{ label }` (the 'label' literal it can take), `{ unknown }` (a value this static
 * scan cannot read), or null (never 'label'). It follows literals, same-file constants (site.ts
 * keeps the owner's switch in `const PLACEHOLDERS`), conditionals and `??`/`||` fallbacks (every
 * branch counts), and resolvePlaceholderMode(override, fallback). A process.env read is the
 * override itself: unset by default, so never the default. Anything else is unknown, and listed.
 */
function placeholderDefault(node, consts, depth = 0) {
  const current = unwrap(node);
  if (!current || depth > MAX_DEPTH) return { unknown: node };
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text === 'label' ? { label: current } : null;
  if (isEnvRead(current) || (ts.isIdentifier(current) && current.text === 'undefined')) return null;
  if (ts.isIdentifier(current)) {
    const initializer = consts.get(current.text);
    return initializer ? placeholderDefault(initializer, consts, depth + 1) : { unknown: current };
  }
  if (ts.isConditionalExpression(current)) {
    return decisive(placeholderDefault(current.whenTrue, consts, depth + 1), placeholderDefault(current.whenFalse, consts, depth + 1));
  }
  if (ts.isBinaryExpression(current)) {
    const kind = current.operatorToken.kind;
    if (kind === ts.SyntaxKind.QuestionQuestionToken || kind === ts.SyntaxKind.BarBarToken) {
      return decisive(placeholderDefault(current.left, consts, depth + 1), placeholderDefault(current.right, consts, depth + 1));
    }
  }
  if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === 'resolvePlaceholderMode' && current.arguments.length === 2) {
    const [override, fallback] = current.arguments;
    return decisive(placeholderDefault(override, consts, depth + 1), placeholderDefault(fallback, consts, depth + 1));
  }
  return { unknown: current };
}

/**
 * The `const NAME` whose initializer holds this node, or null. Also null when the node sits in an
 * object literal before any declaration: the owner then switches that property (`{ placeholders:
 * 'label' }`), not the variable that holds the object, so the message names no constant.
 */
function constantHolding(node) {
  for (let current = node.parent; current && !ts.isSourceFile(current); current = current.parent) {
    if (ts.isVariableDeclaration(current)) {
      return ts.isIdentifier(current.name) && ts.isVariableDeclarationList(current.parent) && (current.parent.flags & ts.NodeFlags.Const) !== 0 ? current.name.text : null;
    }
    if (ts.isPropertyAssignment(current) || ts.isShorthandPropertyAssignment(current) || ts.isObjectLiteralExpression(current)) return null;
    if (ts.isFunctionLike(current)) return null;
  }
  return null;
}

/**
 * The release switch: one item while a `placeholders` property defaults to 'label', on the line
 * the owner flips (the literal, wherever a constant keeps it). An environment override changes
 * one build, not the default, so it never clears the item. A value the scan cannot read is
 * listed too, so --strict fails closed.
 */
function releaseFinding(file, sourceFile, property, value, consts, where, flags) {
  const source = placeholderDefault(value, consts);
  if (source === null) return null;
  if (source.unknown) {
    const text = `could not tell whether the default is 'label' (‹computed: ${source.unknown.getText(sourceFile)}›): make sure it is 'hide' to go public`;
    return item('release', file, lineOf(sourceFile, property), where, text, flags);
  }
  const constant = constantHolding(source.label);
  const text = `placeholders are in 'label' mode (noindex, no sitemap): switch ${constant ? `${constant} ` : ''}to 'hide' to go public`;
  return item('release', file, lineOf(sourceFile, source.label), where, text, flags);
}

/** True when the node sits in an object literal marked `hidden: true` (never rendered). */
function insideHidden(node) {
  for (let current = node.parent; current && !ts.isSourceFile(current); current = current.parent) {
    if (ts.isObjectLiteralExpression(current)) {
      const hidden = ownProperty(current, 'hidden');
      if (hidden && hidden.kind === ts.SyntaxKind.TrueKeyword) return true;
    }
  }
  return false;
}

/** True when the node is part of a type (a type alias, an annotation, a literal type). */
function insideType(node) {
  for (let current = node.parent; current && !ts.isSourceFile(current); current = current.parent) {
    if (ts.isTypeNode(current) || ts.isTypeAliasDeclaration(current) || ts.isInterfaceDeclaration(current)) return true;
    if (ts.isImportDeclaration(current) || ts.isExportDeclaration(current)) return true;
  }
  return false;
}

/** Lines that refer to a top-level constant by name (besides its declaration). */
function usesOf(sourceFile, name, declaration) {
  const lines = new Set();
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === name && node.parent !== declaration && !insideType(node)) {
      const parent = node.parent;
      const isPropertyName = (ts.isPropertyAssignment(parent) || ts.isPropertyAccessExpression(parent)) && parent.name === node;
      if (!isPropertyName) lines.add(lineOf(sourceFile, node));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...lines].sort((a, b) => a - b);
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

// ─── Scanning ─────────────────────────────────────────────────────────────────────────────

/** Repo-relative POSIX path. */
export function relativePath(file, root = ROOT) {
  return path.relative(root, file).split(path.sep).join('/');
}

function item(kind, file, line, where, text, flags = {}) {
  return { kind, file, line, where, text, optional: flags.optional ?? false, hidden: flags.hidden ?? false, ...(flags.uses ? { uses: flags.uses } : {}) };
}

/**
 * Every to-do in one TypeScript content file.
 * @param {string} file repo-relative path, for the report
 * @param {string} text the file's source
 * @returns {TodoItem[]}
 */
export function scanSource(file, text) {
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const consts = constInitializers(sourceFile);
  /** @type {TodoItem[]} */
  const found = [];
  const phArguments = new Set();

  const flagsFor = (node, optional = false) => {
    const hidden = insideHidden(node);
    return { hidden, optional: optional || hidden };
  };

  const visit = (node) => {
    if (insideType(node)) return;

    if (isPhCall(node)) {
      const argument = node.arguments[0];
      phArguments.add(argument);
      const value = evaluateString(argument, consts);
      const token = value === null ? `[[‹computed: ${argument.getText(sourceFile)}›]]` : `[[${value.trim()}]]`;
      const declaration = ts.isVariableDeclaration(node.parent) && node.parent.initializer === node ? node.parent : null;
      const uses = declaration && ts.isIdentifier(declaration.name) ? usesOf(sourceFile, declaration.name.text, declaration) : undefined;
      found.push(item('token', file, lineOf(sourceFile, node), contextPath(node), token, { ...flagsFor(node), uses }));
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !phArguments.has(node)) {
      // A raw "[[…]]" string written without ph() is a token too.
      for (const match of node.text.matchAll(TOKEN)) {
        found.push(item('token', file, lineOf(sourceFile, node), contextPath(node), match[0], flagsFor(node)));
      }
    } else if (ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name);
      const value = unwrap(node.initializer);
      const object = node.parent;
      const where = contextPath(object);
      if (name === 'example' && value.kind === ts.SyntaxKind.TrueKeyword) {
        found.push(item('example', file, lineOf(sourceFile, node), where, 'example item: replace it with a real one, or delete it', flagsFor(node)));
      } else if (name === 'confirm') {
        const note = evaluateString(node.initializer, consts);
        found.push(item('confirm', file, lineOf(sourceFile, node), where, note ?? `‹computed: ${node.initializer.getText(sourceFile)}›`, flagsFor(node)));
      } else if (Object.hasOwn(NULL_FACTS, name) && value.kind === ts.SyntaxKind.NullKeyword) {
        const fact = NULL_FACTS[name];
        const credential = name !== 'url' || CREDENTIAL_KINDS.has(literalText(ownProperty(object, 'kind')) ?? '');
        if (credential) found.push(item('null', file, lineOf(sourceFile, node), `${where}.${name}`, fact.note, flagsFor(node, fact.optional)));
      } else if (name === 'placeholders') {
        const release = releaseFinding(file, sourceFile, node, node.initializer, consts, `${where}.${name}`, flagsFor(node));
        if (release) found.push(release);
      }
    } else if (ts.isShorthandPropertyAssignment(node) && propertyName(node.name) === 'placeholders') {
      // `{ placeholders }`: the value is the same-named constant.
      const release = releaseFinding(file, sourceFile, node, node.name, consts, `${contextPath(node.parent)}.placeholders`, flagsFor(node));
      if (release) found.push(release);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/**
 * Tokens in a JSON content file (string values containing "[[…]]"), by line.
 * @returns {TodoItem[]}
 */
export function scanJson(file, text) {
  const found = [];
  text.split(/\r?\n/).forEach((lineText, index) => {
    for (const match of lineText.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      for (const token of (match[1] ?? '').matchAll(TOKEN)) {
        found.push(item('token', file, index + 1, '(json)', token[0]));
      }
    }
  });
  return found;
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? walkFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))
    .sort();
}

/**
 * Every content to-do under src/content (TypeScript and JSON), in file and line order.
 * @returns {TodoItem[]}
 */
export function scanContent(root = ROOT) {
  return walkFiles(path.join(root, CONTENT_DIR)).flatMap((file) => {
    const name = relativePath(file, root);
    if (file.endsWith('.d.ts')) return [];
    if (file.endsWith('.ts')) return scanSource(name, readFileSync(file, 'utf8'));
    if (file.endsWith('.json')) return scanJson(name, readFileSync(file, 'utf8'));
    return [];
  });
}

// ─── Environment, assets ──────────────────────────────────────────────────────────────────

/** The environment `next build` would see: .env files (lowest first) under the process env. */
export function loadEnv(root = ROOT, processEnv = process.env) {
  const merged = {};
  for (const name of ['.env', '.env.production', '.env.local', '.env.production.local']) {
    const file = path.join(root, name);
    if (existsSync(file)) Object.assign(merged, parseEnv(readFileSync(file, 'utf8')));
  }
  return { ...merged, ...processEnv };
}

const isSet = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * The production domain and the Resend key (PLAN "Content you supply later").
 * @returns {TodoItem[]}
 */
export function envFindings(env) {
  const found = [];
  if (!isSet(env.NEXT_PUBLIC_SITE_URL) && !isSet(env.VERCEL_PROJECT_PRODUCTION_URL)) {
    found.push(
      item('env', null, null, 'NEXT_PUBLIC_SITE_URL', 'the production domain is not set: canonical URLs, the sitemap and OG images fall back to localhost'),
    );
  }
  if (!isSet(env.RESEND_API_KEY)) {
    found.push(item('env', null, null, 'RESEND_API_KEY', 'not set: in production the contact form is replaced by direct email and LinkedIn links'));
  }
  return found;
}

/**
 * Portraits smaller than PORTRAIT_MIN. `sizeOf` reads an image's pixel size (sharp by default).
 * @returns {Promise<TodoItem[]>}
 */
export async function assetFindings(root = ROOT, sizeOf = imageSize) {
  const files = walkFiles(path.join(root, PORTRAIT_DIR)).filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file));
  if (files.length === 0) return [item('asset', PORTRAIT_DIR, null, 'portrait', 'no portrait file found')];
  const found = [];
  for (const file of files) {
    const name = relativePath(file, root);
    try {
      const { width, height } = await sizeOf(file);
      if (width < PORTRAIT_MIN.width || height < PORTRAIT_MIN.height) {
        found.push(
          item('asset', name, null, 'portrait', `${width}×${height}: supply a high-resolution export of at least ${PORTRAIT_MIN.width}×${PORTRAIT_MIN.height} at the same path`),
        );
      }
    } catch (error) {
      found.push(item('asset', name, null, 'portrait', `could not read its size (${error instanceof Error ? error.message : String(error)})`));
    }
  }
  return found;
}

async function imageSize(file) {
  const { default: sharp } = await import('sharp');
  const { width, height } = await sharp(file).metadata();
  if (!width || !height) throw new Error('no dimensions in the header');
  return { width, height };
}

// ─── Report ───────────────────────────────────────────────────────────────────────────────

/** Totals per kind; `required` counts what --strict fails on. */
export function summarize(items) {
  const byKind = Object.fromEntries(KINDS.map((kind) => [kind, 0]));
  for (const entry of items) byKind[entry.kind] += 1;
  const optional = items.filter((entry) => entry.optional).length;
  return { total: items.length, required: items.length - optional, optional, byKind };
}

const KIND_LABEL = {
  token: ['token', 'tokens'],
  example: ['example', 'examples'],
  null: ['null fact', 'null facts'],
  confirm: ['confirm note', 'confirm notes'],
  env: ['environment variable', 'environment variables'],
  asset: ['asset', 'assets'],
  release: ['release switch', 'release switches'],
};

function oneLine(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function describeItem(entry) {
  const flags = [entry.hidden ? 'hidden item' : null, entry.optional && !entry.hidden ? 'optional' : null].filter(Boolean);
  const uses = entry.uses && entry.uses.length > 0 ? ` (used on line${entry.uses.length > 1 ? 's' : ''} ${entry.uses.join(', ')})` : '';
  const tail = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
  return `${entry.kind.padEnd(7)}  ${entry.where}: ${oneLine(entry.text)}${uses}${tail}`;
}

/** The human report: content grouped by file, then environment and assets, then the total. */
export function formatReport(items) {
  const lines = [];
  const groups = new Map();
  for (const entry of items) {
    const key = entry.kind === 'env' ? 'Environment' : entry.file ?? 'Other';
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  for (const [group, entries] of groups) {
    lines.push(`${group} (${entries.length})`);
    for (const entry of entries) {
      const where = entry.line === null ? '' : `${entry.file}:${entry.line}  `;
      lines.push(`  ${where}${describeItem(entry)}`);
    }
    lines.push('');
  }
  const summary = summarize(items);
  const parts = KINDS.filter((kind) => summary.byKind[kind] > 0).map((kind) => {
    const count = summary.byKind[kind];
    return `${count} ${KIND_LABEL[kind][count === 1 ? 0 : 1]}`;
  });
  lines.push(`Total: ${summary.total} (${parts.join(', ') || 'nothing left'}); ${summary.required} required, ${summary.optional} optional.`);
  return lines.join('\n');
}

function escapeData(text) {
  return text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function escapeProperty(text) {
  return escapeData(text).replaceAll(':', '%3A').replaceAll(',', '%2C');
}

/** GitHub Actions annotations, one ::warning per item (CI shows content:todo as warnings). */
export function githubAnnotations(items) {
  return items.map((entry) => {
    const props = [entry.file ? `file=${escapeProperty(entry.file)}` : null, entry.line ? `line=${entry.line}` : null, `title=${escapeProperty(`content:todo ${entry.kind}`)}`]
      .filter(Boolean)
      .join(',');
    return `::warning ${props}::${escapeData(`${entry.where}: ${oneLine(entry.text)}`)}`;
  });
}

/** Everything to supply or confirm: content, then environment, then assets. */
export async function collect(root = ROOT, env = loadEnv(root)) {
  return [...scanContent(root), ...envFindings(env), ...(await assetFindings(root))];
}

/**
 * The CLI. Returns the exit code: 0, or 1 under --strict while required items remain (2 for a
 * bad option). `options` lets tests point it at another root, environment and output.
 */
export async function main(argv = process.argv.slice(2), options = {}) {
  const { root = ROOT, env = loadEnv(root), log = console.log, error = console.error, github = process.env.GITHUB_ACTIONS === 'true' } = options;
  const flags = new Set(argv);
  const unknown = [...flags].filter((flag) => !['--strict', '--json', '--github'].includes(flag));
  if (unknown.length > 0) {
    error(`content:todo: unknown option ${unknown.join(' ')} (use --strict, --json or --github)`);
    return 2;
  }
  const items = await collect(root, env);
  const summary = summarize(items);
  const failed = flags.has('--strict') && summary.required > 0;
  if (flags.has('--json')) {
    log(JSON.stringify({ items, summary }, null, 2));
  } else {
    log(`content:todo: what is left to supply or confirm (PLAN "Content you supply later")\n`);
    log(formatReport(items));
    if (failed) log('\n--strict: required items remain, so this is not ready for a client-facing release.');
  }
  // Annotations go with the text report (or on request), never into --json output.
  if (flags.has('--github') || (github && !flags.has('--json'))) {
    for (const line of githubAnnotations(items)) log(line);
  }
  return failed ? 1 : 0;
}

function invokedDirectly() {
  try {
    return realpathSync.native(process.argv[1] ?? '') === realpathSync.native(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 2;
    },
  );
}
