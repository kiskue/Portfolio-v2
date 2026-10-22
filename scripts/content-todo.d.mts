/** Types for content-todo.mjs (npm run content:todo). */

export type TodoKind = 'token' | 'example' | 'null' | 'confirm' | 'env' | 'asset' | 'release';

export interface TodoItem {
  readonly kind: TodoKind;
  /** Repo-relative POSIX path, or null (environment items). */
  readonly file: string | null;
  /** 1-based line, or null (environment and asset items). */
  readonly line: number | null;
  /** A readable path to the value, e.g. "testimonials[example-client-app].name". */
  readonly where: string;
  /** The token, the confirm note, or what is missing. */
  readonly text: string;
  /** Listed, but --strict does not fail on it (hidden items, the CV, verification links). */
  readonly optional: boolean;
  /** The value sits inside a `hidden: true` entry (never rendered). */
  readonly hidden: boolean;
  /** For a shared token constant: the lines that use it. */
  readonly uses?: readonly number[];
}

export interface TodoSummary {
  readonly total: number;
  readonly required: number;
  readonly optional: number;
  readonly byKind: Readonly<Record<TodoKind, number>>;
}

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

export declare const ROOT: string;
export declare const CONTENT_DIR: string;
export declare const PORTRAIT_DIR: string;
export declare const PORTRAIT_MIN: ImageSize;
export declare const KINDS: readonly TodoKind[];
export declare const NULL_FACTS: Readonly<Record<string, { readonly note: string; readonly optional: boolean }>>;

export declare function relativePath(file: string, root?: string): string;
export declare function scanSource(file: string, text: string): TodoItem[];
export declare function scanJson(file: string, text: string): TodoItem[];
export declare function scanContent(root?: string): TodoItem[];
export declare function loadEnv(root?: string, processEnv?: Record<string, string | undefined>): Record<string, string | undefined>;
export declare function envFindings(env: Record<string, string | undefined>): TodoItem[];
export declare function assetFindings(root?: string, sizeOf?: (file: string) => Promise<ImageSize>): Promise<TodoItem[]>;
export declare function summarize(items: readonly TodoItem[]): TodoSummary;
export declare function formatReport(items: readonly TodoItem[]): string;
export declare function githubAnnotations(items: readonly TodoItem[]): string[];
export declare function collect(root?: string, env?: Record<string, string | undefined>): Promise<TodoItem[]>;
export interface MainOptions {
  readonly root?: string;
  readonly env?: Record<string, string | undefined>;
  readonly log?: (line: string) => void;
  readonly error?: (line: string) => void;
  /** Print GitHub Actions annotations with the text report (default: GITHUB_ACTIONS === 'true'). */
  readonly github?: boolean;
}

export declare function main(argv?: readonly string[], options?: MainOptions): Promise<number>;
